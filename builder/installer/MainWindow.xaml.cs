using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;

namespace PillInstaller;

public partial class MainWindow : Window
{
    private PayloadManifest M => App.Manifest;
    private InstallEngine Engine { get; }
    private int _step = 0;
    private bool _isUpdate;
    private const int Welcome = 0, License = 1, Directory = 2, Installing = 3, Done = 4;

    public MainWindow()
    {
        InitializeComponent();
        Engine = new InstallEngine(M);
        _isUpdate = Engine.IsInstalled();

        BrandInitial.Text = (string.IsNullOrEmpty(M.AppName) ? "A" : M.AppName[0].ToString()).ToUpper();
        BrandName.Text = M.AppName;
        BrandVer.Text = "v" + M.Version;
        WelcomeSub.Text = _isUpdate
            ? $"检测到已安装「{M.AppName}」，下面将升级到版本 {M.Version}。"
            : $"下面将把「{M.AppName}」安装到你的电脑上。";

        LicenseText.Text = M.IncludeLicense && !string.IsNullOrWhiteSpace(M.LicenseText)
            ? M.LicenseText
            : "安装此软件即表示您接受以下条款：\n\n该软件按“现状”提供，不提供任何明示或暗示的担保。\n使用本软件所产生的一切后果由使用者自行承担。";

        bool canChange = M.AllowChangeDir;
        BrowseBtn.IsEnabled = canChange;
        DirBox.IsReadOnly = !canChange;
        DirBox.Text = Engine.ResolveDefaultDir();

        RunAfterBox.IsChecked = M.RunAfterInstall;
        RunAfterBox.Visibility = M.RunAfterInstall ? Visibility.Visible : Visibility.Collapsed;

        if (!M.IncludeLicense) AcceptBox.IsChecked = true;

        ShowStep(Welcome);
    }

    private void ShowStep(int step)
    {
        _step = step;
        WelcomePanel.Visibility  = step == Welcome ? Visibility.Visible : Visibility.Collapsed;
        LicensePanel.Visibility  = step == License ? Visibility.Visible : Visibility.Collapsed;
        DirPanel.Visibility      = step == Directory ? Visibility.Visible : Visibility.Collapsed;
        InstallingPanel.Visibility = step == Installing ? Visibility.Visible : Visibility.Collapsed;
        DonePanel.Visibility     = step == Done ? Visibility.Visible : Visibility.Collapsed;

        BackBtn.Visibility    = step is Welcome or Installing or Done ? Visibility.Collapsed : Visibility.Visible;
        NextBtn.Visibility    = step is Welcome or License ? Visibility.Visible : Visibility.Collapsed;
        InstallBtn.Visibility = step == Directory ? Visibility.Visible : Visibility.Collapsed;
        FinishBtn.Visibility  = step == Done ? Visibility.Visible : Visibility.Collapsed;

        if (step == License)
            RefreshNextEnabled();
    }

    private void RefreshNextEnabled()
    {
        NextBtn.IsEnabled = !M.IncludeLicense || AcceptBox.IsChecked == true;
    }

    private void NextBtn_Click(object sender, RoutedEventArgs e)
    {
        if (_step == License && !AcceptBox.IsChecked.GetValueOrDefault()) return;
        if (_step == Welcome && !M.IncludeLicense) { ShowStep(Directory); return; }
        if (_step == License) { ShowStep(Directory); return; }
        ShowStep(_step + 1);
    }

    private void BackBtn_Click(object sender, RoutedEventArgs e) => ShowStep(_step == Directory && !M.IncludeLicense ? Welcome : _step - 1);

    private void AcceptBox_Changed(object sender, RoutedEventArgs e) => RefreshNextEnabled();

    private void BrowseBtn_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new OpenFolderDialog { Title = "选择安装目录" };
        if (dlg.ShowDialog(this) == true)
        {
            DirBox.Text = dlg.FolderName;
        }
    }

    private async void InstallBtn_Click(object sender, RoutedEventArgs e)
    {
        string dir = string.IsNullOrWhiteSpace(DirBox.Text) ? Engine.ResolveDefaultDir() : DirBox.Text.Trim();
        ShowStep(Installing);
        Progress.IsIndeterminate = true;

        // 在 STA 线程执行安装（WScript.Shell 快捷方式需要 STA）
        var tcs = new TaskCompletionSource<bool>();
        var th = new Thread(() =>
        {
            try
            {
                Engine.Install(dir, (msg) => Dispatcher.Invoke(() => { StatusText.Text = msg; }));
                tcs.SetResult(true);
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        });
        th.SetApartmentState(ApartmentState.STA);
        th.IsBackground = true;
        th.Start();

        try { await tcs.Task; }
        catch (Exception ex)
        {
            Progress.IsIndeterminate = false;
            StatusText.Text = "安装失败：" + ex.Message;
            ShowStep(Directory);
            return;
        }

        Progress.IsIndeterminate = false;
        Progress.Value = 100;
        StatusText.Text = "完成";
        DoneSub.Text = _isUpdate ? "已更新到新版本。" : "已成功安装到你的电脑。";
        ShowStep(Done);
    }

    private void FinishBtn_Click(object sender, RoutedEventArgs e)
    {
        if (RunAfterBox.IsChecked == true)
        {
            InstallEngine.Launch(Engine.ExePath(Engine.ResolveDefaultDir()), Engine.ResolveDefaultDir());
        }
        Close();
    }

    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Close();

    private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
    {
        if (_step == Installing) e.Cancel = true;
    }
}
