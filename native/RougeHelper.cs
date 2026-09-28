using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;

public static class RougeHelper
{
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int k);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc cb, IntPtr mod, uint tid);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr h, int n, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern int GetMessage(out MSG m, IntPtr h, uint a, uint b);
    [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string n);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, int f, StringBuilder s, ref int n);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint a, bool i, uint pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);

    [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr h; public uint m; public IntPtr w; public IntPtr l; public uint t; public int x; public int y; }
    [StructLayout(LayoutKind.Sequential)] struct MSLL { public int x; public int y; public uint data; public uint flags; public uint time; public IntPtr extra; }
    delegate IntPtr HookProc(int n, IntPtr w, IntPtr l);

    const byte VK_ALT = 0x12, VK_CTRL = 0x11, VK_MASK = 0xE8, KEYUP = 2;
    static HookProc mouseProc, keyProc;
    static IntPtr mouseHook, keyHook;
    static bool masked;
    public static volatile bool KeysOn;
    static readonly object outLock = new object();

    static bool AltDown() { return (GetAsyncKeyState(VK_ALT) & 0x8000) != 0; }
    static void Tap(byte vk) { keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, KEYUP, UIntPtr.Zero); }

    public static void Emit(string s) { lock (outLock) { Console.Out.WriteLine(s); Console.Out.Flush(); } }

    static string Esc(string s)
    {
        if (s == null) return "";
        var b = new StringBuilder();
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c < 32) b.Append(' ');
            else b.Append(c);
        }
        return b.ToString();
    }

    static IntPtr MouseCb(int n, IntPtr w, IntPtr l)
    {
        if (n >= 0)
        {
            int msg = (int)w;
            bool alt = AltDown();
            if (!alt) masked = false;
            if (msg == 0x020A && alt)
            {
                var d = (MSLL)Marshal.PtrToStructure(l, typeof(MSLL));
                short delta = (short)(d.data >> 16);

                if (!masked) { Tap(VK_MASK); masked = true; }
                Emit("{\"type\":\"wheel\",\"delta\":" + delta + "}");
                return (IntPtr)1;
            }
            if (KeysOn && (msg == 0x0201 || msg == 0x0204 || msg == 0x0207))
            {
                var d = (MSLL)Marshal.PtrToStructure(l, typeof(MSLL));
                Emit("{\"type\":\"click\",\"x\":" + d.x + ",\"y\":" + d.y + "}");
            }
        }
        return CallNextHookEx(mouseHook, n, w, l);
    }

    static bool MenuKey(int vk) { return vk == 0x26 || vk == 0x28 || vk == 0x0D || vk == 0x1B || (vk >= 0x31 && vk <= 0x39); }

    static IntPtr KeyCb(int n, IntPtr w, IntPtr l)
    {
        if (n >= 0 && KeysOn)
        {
            int msg = (int)w, vk = Marshal.ReadInt32(l);
            if (MenuKey(vk))
            {
                if (msg == 0x100 || msg == 0x104) Emit("{\"type\":\"key\",\"vk\":" + vk + "}");
                return (IntPtr)1;
            }
        }
        return CallNextHookEx(keyHook, n, w, l);
    }

    static void StartHooks()
    {
        var t = new Thread(() =>
        {
            mouseProc = MouseCb; keyProc = KeyCb;
            IntPtr mod = GetModuleHandle(null);
            mouseHook = SetWindowsHookEx(14, mouseProc, mod, 0);
            keyHook = SetWindowsHookEx(13, keyProc, mod, 0);
            MSG m;
            while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) { }
        });
        t.IsBackground = true;
        t.Start();
    }

    static readonly string[] Browsers = { "chrome", "msedge", "brave", "vivaldi", "opera", "firefox", "arc", "thorium", "chromium", "zen", "librewolf", "waterfox" };

    static string Url(IntPtr h)
    {
        try
        {
            var root = AutomationElement.FromHandle(h);
            var el = root.FindFirst(TreeScope.Descendants, new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit));
            object p;
            if (el != null && el.TryGetCurrentPattern(ValuePattern.Pattern, out p)) return ((ValuePattern)p).Current.Value;
        }
        catch { }
        return "";
    }

    static string Foreground()
    {
        IntPtr h = GetForegroundWindow();
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        var title = new StringBuilder(512);
        GetWindowText(h, title, 512);
        string exe = "";
        IntPtr ph = OpenProcess(0x1000, false, pid);
        if (ph != IntPtr.Zero)
        {
            var eb = new StringBuilder(1024);
            int n = 1024;
            if (QueryFullProcessImageName(ph, 0, eb, ref n)) exe = eb.ToString();
            CloseHandle(ph);
        }
        string name = "";
        try { name = FileVersionInfo.GetVersionInfo(exe).FileDescription; } catch { }
        string url = "";
        string baseName = "";
        try { baseName = System.IO.Path.GetFileNameWithoutExtension(exe).ToLowerInvariant(); } catch { }
        if (Array.IndexOf(Browsers, baseName) >= 0) url = Url(h);
        return "{\"hwnd\":" + h.ToInt64() + ",\"exe\":\"" + Esc(exe) + "\",\"name\":\"" + Esc(name) +
               "\",\"title\":\"" + Esc(title.ToString()) + "\",\"url\":\"" + Esc(url) + "\"}";
    }

    static void Paste()
    {
        if (AltDown()) { Tap(VK_MASK); keybd_event(VK_ALT, 0, KEYUP, UIntPtr.Zero); }
        keybd_event(VK_CTRL, 0, 0, UIntPtr.Zero);
        Tap(0x56);
        keybd_event(VK_CTRL, 0, KEYUP, UIntPtr.Zero);
    }

    public static void Run()
    {
        StartHooks();
        Emit("{\"type\":\"ready\"}");
        string line;
        while ((line = Console.In.ReadLine()) != null)
        {
            var parts = line.Trim().Split(' ');
            try
            {
                switch (parts[0])
                {
                    case "fg": Emit("{\"type\":\"fg\",\"id\":" + parts[1] + ",\"info\":" + Foreground() + "}"); break;
                    case "keys": KeysOn = parts.Length > 1 && parts[1] == "1"; break;
                    case "paste": Paste(); break;
                }
            }
            catch (Exception e) { Emit("{\"type\":\"error\",\"msg\":\"" + Esc(e.Message) + "\"}"); }
        }
    }
}
