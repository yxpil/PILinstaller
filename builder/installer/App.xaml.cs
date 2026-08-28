using System;
using System.IO;
using System.Linq;
using System.Windows;

namespace PillInstaller;

public partial class App : Application
{
    public static PayloadManifest Manifest { get; private set; } = new PayloadManifest();
    public static bool Silent { get; private set; } = false;
    public static bool IsUninstall { get; private set; } = false;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        string[] args = e.Args ?? new string[0];
        Silent = args.Any(a =>
            a.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
            a.Equals("/SILENT", StringComparison.OrdinalIgnoreCase) ||
            a.Equals("/VERYSILENT", StringComparison.OrdinalIgnoreCase) ||
            a.Equals("/SILENTINSTALL", StringComparison.OrdinalIgnoreCase));

        // 以 uninstall.exe 运行 / 带 /uninstall 参数 → 进入卸载模式
        string proc = Path.GetFileNameWithoutExtension(Environment.ProcessPath ?? "");
        IsUninstall = proc.Equals("uninstall", StringComparison.OrdinalIgnoreCase)
            || args.Any(a => a.Equals("/uninstall", StringComparison.OrdinalIgnoreCase));

        Manifest = PayloadManifest.Load();

        if (IsUninstall)
        {
            if (Silent)
            {
                try { new InstallEngine(Manifest).Uninstall(true); } catch { }
                Shutdown(0);
                return;
            }
            new UninstallWindow().Show();
            return;
        }

        if (Silent)
        {
            new InstallEngine(Manifest).RunSilent();
            Shutdown(0);
            return;
        }

        new MainWindow().Show();
    }
}
