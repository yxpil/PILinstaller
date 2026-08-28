using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace PillInstaller;

public partial class UninstallWindow : Window
{
    private readonly InstallEngine _engine;

    public UninstallWindow()
    {
        InitializeComponent();
        var m = App.Manifest;
        _engine = new InstallEngine(m);

        UiInitial.Text = (string.IsNullOrEmpty(m.AppName) ? "P" : m.AppName[0].ToString()).ToUpper();
        UiTitle.Text = "卸载 " + m.AppName;
        Msg.Text = "确定要卸载「" + m.AppName + "」吗？卸载后无法恢复。";
    }

    private async void UninstallBtn_Click(object sender, RoutedEventArgs e)
    {
        UninstallBtn.IsEnabled = false;
        ItemsPanel.Visibility = Visibility.Collapsed;
        Status.Visibility = Visibility.Visible;
        Progress.Visibility = Visibility.Visible;
        Progress.IsIndeterminate = true;

        var tcs = new TaskCompletionSource<bool>();
        var th = new Thread(() =>
        {
            try { _engine.Uninstall(false, (msg) => Dispatcher.Invoke(() => Status.Text = msg)); tcs.SetResult(true); }
            catch (Exception ex) { tcs.SetException(ex); }
        });
        th.SetApartmentState(ApartmentState.STA);
        th.IsBackground = true;
        th.Start();

        try { await tcs.Task; }
        catch (Exception ex)
        {
            Progress.IsIndeterminate = false;
            Status.Text = "卸载失败：" + ex.Message;
            return;
        }

        Progress.IsIndeterminate = false;
        Progress.Value = 100;
        Status.Text = "已卸载。";
        UninstallBtn.Content = "完成";
        UninstallBtn.Click -= UninstallBtn_Click;
        UninstallBtn.Click += FinishBtn_Click;
        UninstallBtn.IsEnabled = true;
    }

    private void FinishBtn_Click(object sender, RoutedEventArgs e) => Close();
    private void CloseBtn_Click(object sender, RoutedEventArgs e) => Close();
}
