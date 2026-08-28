using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using Microsoft.Win32;

namespace PillInstaller;

/// <summary>安装/卸载引擎（自研，无需 Inno/NSIS）</summary>
public class InstallEngine
{
    private readonly PayloadManifest _m;
    private const string AppZipSuffix = "app.zip";

    public InstallEngine(PayloadManifest m) => _m = m;

    public string ResolveDefaultDir()
    {
        string dir = _m.DefaultInstallDir;
        dir = dir.Replace("%ProgramW6432%", Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles));
        dir = dir.Replace("%ProgramFiles%", Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles));
        dir = dir.Replace("%LocalAppData%", Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData));
        dir = dir.Replace("%AppData%", Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData));
        return dir;
    }

    public string ExePath(string installDir) => Path.Combine(installDir, _m.ExeRelPath.Replace('/', '\\'));
    private string UninstallerPath(string installDir) => Path.Combine(installDir, "uninstall.exe");

    // ============ 静默安装 ============
    public void RunSilent() => Install(ResolveDefaultDir(), null);

    // ============ 安装 ============
    public void Install(string installDir, Action<string>? progress)
    {
        Directory.CreateDirectory(installDir);
        progress?.Invoke("正在复制文件…");
        ExtractTo(installDir);

        progress?.Invoke("正在生成卸载程序…");
        CopySelfAsUninstaller(installDir);

        // 先写注册表（保证出现在"安装的应用"里），快捷方式尽力而为
        progress?.Invoke("正在写入注册表…");
        WriteRegistry(installDir);

        progress?.Invoke("正在创建快捷方式…");
        try { CreateShortcuts(installDir); } catch { }

        if (_m.RunAfterInstall)
            Launch(ExePath(installDir), installDir);
    }

    public void ExtractTo(string installDir)
    {
        var asm = Assembly.GetExecutingAssembly();
        string? name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(AppZipSuffix));
        if (name == null) return;

        using Stream s = asm.GetManifestResourceStream(name)!;
        using var zip = new ZipArchive(s, ZipArchiveMode.Read);
        foreach (var entry in zip.Entries)
        {
            if (string.IsNullOrEmpty(entry.Name)) continue;
            string target = Path.Combine(installDir, entry.FullName);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            using Stream inS = entry.Open();
            using FileStream outS = File.Create(target);
            inS.CopyTo(outS);
        }
    }

    // 把当前运行中的安装器复制一份到安装目录，作为独立卸载程序 uninstall.exe
    private void CopySelfAsUninstaller(string installDir)
    {
        try
        {
            string? src = Environment.ProcessPath;
            if (string.IsNullOrEmpty(src)) return;
            File.Copy(src, UninstallerPath(installDir), true);
        }
        catch { }
    }

    // ============ 卸载 ============
    public void Uninstall(bool silent, Action<string>? progress = null)
    {
        string installDir = Path.GetDirectoryName(Environment.ProcessPath) ?? "";

        progress?.Invoke("正在移除快捷方式…");
        RemoveShortcuts();

        progress?.Invoke("正在清理注册表…");
        RemoveRegistry();

        progress?.Invoke("正在删除文件…");
        DeleteFiles(installDir);

        // 最后用命令延迟删除自身目录（含正在运行的 uninstall.exe）
        ScheduleSelfDelete(installDir);
    }

    private void RemoveShortcuts()
    {
        try
        {
            string desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), _m.AppName + ".lnk");
            if (File.Exists(desktop)) File.Delete(desktop);
        }
        catch { }

        try
        {
            if (_m.CreateStartMenu)
            {
                string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), _m.StartMenuName);
                foreach (var f in new[] { _m.AppName + ".lnk", "卸载 " + _m.AppName + ".lnk" })
                {
                    var p = Path.Combine(dir, f);
                    if (File.Exists(p)) File.Delete(p);
                }
                try { Directory.Delete(dir, false); } catch { }
            }
        }
        catch { }
    }

    private void RemoveRegistry()
    {
        if (!_m.WriteRegistry) return;
        string unsub = _m.RegistryKey.Split('\\').Last();
        try { Registry.LocalMachine.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + unsub, false); } catch { }
        try { Registry.LocalMachine.DeleteSubKeyTree(_m.RegistryKey, false); } catch { }
    }

    private void DeleteFiles(string installDir)
    {
        if (string.IsNullOrEmpty(installDir) || !Directory.Exists(installDir)) return;
        string self = Environment.ProcessPath ?? "";
        foreach (var f in Directory.GetFiles(installDir, "*", SearchOption.AllDirectories))
        {
            if (!string.IsNullOrEmpty(self) && string.Equals(f, self, StringComparison.OrdinalIgnoreCase)) continue;
            try { File.SetAttributes(f, FileAttributes.Normal); File.Delete(f); } catch { }
        }
    }

    private void ScheduleSelfDelete(string installDir)
    {
        try
        {
            string cmd = "/c ping -n 3 127.0.0.1 > nul & rd /s /q \"" + installDir + "\"";
            Process.Start(new ProcessStartInfo("cmd.exe", cmd) { WindowStyle = ProcessWindowStyle.Hidden, UseShellExecute = false });
        }
        catch { }
    }

    public void CreateShortcuts(string installDir)
    {
        string exe = ExePath(installDir);
        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null) return;
        dynamic shell = Activator.CreateInstance(shellType)!;

        if (_m.CreateDesktop)
        {
            string link = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), _m.AppName + ".lnk");
            CreateShortcut(shell, link, exe, installDir);
        }

        if (_m.CreateStartMenu)
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), _m.StartMenuName);
            Directory.CreateDirectory(dir);
            CreateShortcut(shell, Path.Combine(dir, _m.AppName + ".lnk"), exe, installDir);
            CreateShortcut(shell, Path.Combine(dir, "卸载 " + _m.AppName + ".lnk"), UninstallerPath(installDir), installDir);
        }
    }

    private static void CreateShortcut(dynamic shell, string shortcutPath, string targetPath, string workDir)
    {
        dynamic sc = shell.CreateShortcut(shortcutPath);
        if (targetPath.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase))
        {
            sc.TargetPath = "cmd.exe";
            sc.Arguments = "/c \"\"" + targetPath + "\"\"";
        }
        else
        {
            sc.TargetPath = targetPath;
        }
        sc.WorkingDirectory = string.IsNullOrEmpty(workDir) ? Path.GetDirectoryName(targetPath) : workDir;
        sc.IconLocation = targetPath + ",0";
        sc.Save();
    }

    public void WriteRegistry(string installDir)
    {
        if (!_m.WriteRegistry) return;
        string unsub = _m.RegistryKey.Split('\\').Last();

        // 覆盖旧入口：删掉可能残留的（含老版本指向 uninstall.cmd 的 32/64 位）同名项，保证"安装的应用"始终是本次结果
        try { Registry.LocalMachine.DeleteSubKeyTree(_m.RegistryKey, false); } catch { }
        try { Registry.LocalMachine.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + unsub, false); } catch { }
        try { using var b = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry32);
                   b.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + unsub, false); } catch { }

        using (var k = Registry.LocalMachine.CreateSubKey(_m.RegistryKey))
        {
            k.SetValue("InstallDir", installDir);
            k.SetValue("DisplayName", _m.AppName);
            k.SetValue("DisplayVersion", _m.Version);
            k.SetValue("Publisher", _m.Publisher);
        }

        using var u = Registry.LocalMachine.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + unsub);
        u.SetValue("DisplayName", _m.AppName);
        u.SetValue("DisplayVersion", _m.Version);
        u.SetValue("Publisher", _m.Publisher);
        u.SetValue("DisplayIcon", ExePath(installDir));
        u.SetValue("InstallLocation", installDir);
        // 卸载入口指向独立的 uninstall.exe（不再使用任何 .cmd）
        string uexe = "\"" + UninstallerPath(installDir) + "\"";
        u.SetValue("UninstallString", uexe);
        u.SetValue("QuietUninstallString", uexe + " /S");
        u.SetValue("NoModify", 1);
        u.SetValue("NoRepair", 1);
        u.SetValue("EstimatedSize", 4096);
    }

    /// <summary>是否已通过注册表检测到本应用已安装（用于区分 升级 / 全新安装）</summary>
    public bool IsInstalled()
    {
        if (!_m.WriteRegistry) return false;
        string unsub = _m.RegistryKey.Split('\\').Last();
        try { using var k = Registry.LocalMachine.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + unsub); return k != null; }
        catch { return false; }
    }

    public static void Launch(string exePath, string workDir)
    {
        try
        {
            Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = workDir, UseShellExecute = true });
        }
        catch { }
    }
}
