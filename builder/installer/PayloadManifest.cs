using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;

namespace PillInstaller;

/// <summary>安装包元信息（由 CLI 生成，随 app.zip 一起嵌入）</summary>
public class PayloadManifest
{
    public string AppName { get; set; } = "我的应用";
    public string Version { get; set; } = "1.0.0";
    public string Publisher { get; set; } = "";

    /// <summary>主程序在安装目录下的相对路径，例如 "app.exe" 或 "bin\\app.exe"</summary>
    public string ExeRelPath { get; set; } = "app.exe";

    /// <summary>默认安装目录，含 %ProgramFiles% / %LocalAppData% / %AppData% 占位符</summary>
    public string DefaultInstallDir { get; set; } = "%ProgramFiles%\\我的应用";

    public bool AllowChangeDir { get; set; } = true;
    public bool CreateStartMenu { get; set; } = true;
    public string StartMenuName { get; set; } = "我的应用";
    public bool CreateDesktop { get; set; } = true;
    public bool RunAfterInstall { get; set; } = false;
    public bool WriteRegistry { get; set; } = true;
    public string RegistryKey { get; set; } = "Software\\我的应用";

    public bool IncludeLicense { get; set; } = true;
    public string LicenseText { get; set; } = "";
    public string Language { get; set; } = "zh";

    private const string ManifestSuffix = "manifest.json";
    private const string AppZipSuffix = "app.zip";
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    public static PayloadManifest Load()
    {
        try
        {
            var asm = Assembly.GetExecutingAssembly();
            string? name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(ManifestSuffix));
            if (name == null) return new PayloadManifest();
            using Stream s = asm.GetManifestResourceStream(name)!;
            using StreamReader r = new(s);
            string json = r.ReadToEnd();
            return JsonSerializer.Deserialize<PayloadManifest>(json, JsonOpts) ?? new PayloadManifest();
        }
        catch
        {
            return new PayloadManifest();
        }
    }

    public bool HasAppZip()
    {
        var asm = Assembly.GetExecutingAssembly();
        return asm.GetManifestResourceNames().Any(n => n.EndsWith(AppZipSuffix));
    }
}
