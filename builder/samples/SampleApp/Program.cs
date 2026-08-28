using System;
using System.IO;
using System.Windows.Forms;

namespace SampleApp
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();

            bool silent = args.Length > 0 && args[0].Equals("/silent", StringComparison.OrdinalIgnoreCase);

            if (silent)
            {
                File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "installed.txt"),
                    $"Installed sample app (Pill Installer) @ {DateTime.Now}\n");
                return;
            }

            MessageBox.Show(
                "你的 Pill 安装器已成功安装本示例程序！\n\n" +
                "这是一个由「自研 C# WPF 安装器」打包进来的示例应用。\n" +
                "（本质：安装器把 app.zip 解压到安装目录）",
                "SampleApp · Pill Installer",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
