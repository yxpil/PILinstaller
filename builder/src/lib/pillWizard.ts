import type { BuildConfig } from './types';

/**
 * 生成 Inno Setup 的 [Code] 段：把安装向导"完全重做"成 Pill 风格
 *  - 无边框 + 圆角窗口（CreateRoundRectRgn / SetWindowRgn）
 *  - 纯黑白双主题（白色主体 + 黑色品牌栏）
 *  - 顶部品牌栏（Logo 首字母 + 应用名 + 版本）
 *  - 药丸圆角按钮（对原生按钮做圆角 Region）
 */
export function generatePillCode(cfg: BuildConfig): string {
  const appName = cfg.appName || 'MyApp';
  const version = cfg.version || '1.0.0';
  const logoChar = (cfg.logoName || appName).charAt(0).toUpperCase();

  return `[Code]
const
  PBG    = clWhite;      // 主背景
  PBRAND = $0A0A0A;      // 品牌黑
  PBRANDFG = clWhite;    // 品牌栏文字
  PSOFT  = $F4F4F5;      // 浅灰
  PTEXT  = $18181B;      // 正文（近黑）
  PMUTED = $71717A;      // 次要灰
  PSEP   = $E4E4E7;      // 分隔线

var
  BrandBar: TPanel;
  BrandLogo: TNewStaticText;
  BrandTitle: TNewStaticText;
  BrandVersion: TNewStaticText;

// 让当前控件圆角成"药丸"
procedure RoundPill(Ctl: TWinControl; Rad: Integer);
var
  Rgn: Longint;
begin
  Rgn := CreateRoundRectRgn(0, 0, Ctl.Width + 1, Ctl.Height + 1, Rad, Rad);
  SetWindowRgn(Ctl.Handle, Rgn, True);
end;

// 设置字体
procedure SetFont(Ctl: TNewStaticText; ASize: Integer; AColor: TColor; ABold: Boolean);
begin
  Ctl.Font.Name := 'Segoe UI';
  Ctl.Font.Size := ASize;
  Ctl.Font.Color := AColor;
  if ABold then Ctl.Font.Style := Ctl.Font.Style + [fsBold];
end;

// 顶部品牌栏
procedure BuildBrandBar;
begin
  BrandBar := TPanel.Create(WizardForm);
  BrandBar.Parent := WizardForm;
  BrandBar.SetBounds(0, 0, WizardForm.ClientWidth, 76);
  BrandBar.Color := PBRAND;
  BrandBar.BevelOuter := bvNone;
  BrandBar.ParentBackground := False;

  BrandLogo := TNewStaticText.Create(BrandBar);
  BrandLogo.Parent := BrandBar;
  BrandLogo.SetBounds(20, 14, 48, 48);
  BrandLogo.Alignment := taCenter;
  BrandLogo.Caption := '${logoChar}';
  BrandLogo.Font.Name := 'Segoe UI';
  BrandLogo.Font.Size := 22;
  BrandLogo.Font.Style := [fsBold];
  BrandLogo.Font.Color := PBRANDFG;
  BrandLogo.Color := PBRAND;
  RoundPill(BrandLogo, 24);

  BrandTitle := TNewStaticText.Create(BrandBar);
  BrandTitle.Parent := BrandBar;
  BrandTitle.SetBounds(82, 16, WizardForm.ClientWidth - 160, 24);
  BrandTitle.Caption := '${appName}';
  SetFont(BrandTitle, 15, PBRANDFG, True);

  BrandVersion := TNewStaticText.Create(BrandBar);
  BrandVersion.Parent := BrandBar;
  BrandVersion.SetBounds(82, 42, WizardForm.ClientWidth - 160, 18);
  BrandVersion.Caption := '版本 ${version}';
  SetFont(BrandVersion, 9, $B4B4B8, False);
end;

// 调整原生按钮为"药丸 + 白底黑字"
procedure StyleNavButtons;
begin
  WizardForm.NextButton.Height := 40;
  WizardForm.BackButton.Height := 40;
  WizardForm.CancelButton.Height := 40;

  WizardForm.NextButton.Left := WizardForm.ClientWidth - 132;
  WizardForm.NextButton.Top  := WizardForm.ClientHeight - 58;
  WizardForm.BackButton.Left := WizardForm.ClientWidth - 262;
  WizardForm.BackButton.Top  := WizardForm.ClientHeight - 58;
  WizardForm.CancelButton.Left := WizardForm.ClientWidth - 372;
  WizardForm.CancelButton.Top  := WizardForm.ClientHeight - 58;

  RoundPill(WizardForm.NextButton, 22);
  RoundPill(WizardForm.BackButton, 22);
  RoundPill(WizardForm.CancelButton, 22);
end;

// 全局配色
procedure ApplyPillColors;
begin
  WizardForm.Color := PBG;
  WizardForm.BorderStyle := bsNone;
  WizardForm.MainPanel.Color := PBG;
  WizardForm.OuterNotebook.Color := PBG;
  WizardForm.InnerNotebook.Color := PBG;

  SetFont(WizardForm.WelcomeLabel1, 15, PTEXT, True);
  SetFont(WizardForm.WelcomeLabel2, 10, PMUTED, False);
  SetFont(WizardForm.PageNameLabel, 15, PTEXT, True);
  SetFont(WizardForm.PageDescriptionLabel, 10, PMUTED, False);
  SetFont(WizardForm.FinishedHeadingLabel, 15, PTEXT, True);
  SetFont(WizardForm.FinishedLabel, 10, PMUTED, False);
  SetFont(WizardForm.SelectDirLabel, 10, PTEXT, False);
  SetFont(WizardForm.DiskSpaceLabel, 9, PMUTED, False);

  // 隐藏默认大图与装饰，保持简洁
  WizardForm.WizardBitmapImage.Visible := False;
  WizardForm.WizardSmallBitmapImage.Visible := False;
end;

procedure InitializeWizard();
begin
  ApplyPillColors;
  BuildBrandBar;
  StyleNavButtons;
  RoundPill(WizardForm, 24);
end;
`;
}
