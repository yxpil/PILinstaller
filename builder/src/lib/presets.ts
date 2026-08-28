export interface LicensePreset {
  id: string;
  title: string;
  text: string;
}

/** 常用许可协议模板（可直接嵌入安装程序） */
export const LICENSE_PRESETS: LicensePreset[] = [
  {
    id: 'mit',
    title: 'MIT License',
    text: `MIT License

Copyright (c) 2026 <PACKAGE_AUTHOR>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },
  {
    id: 'apache2',
    title: 'Apache License 2.0',
    text: `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.`,
  },
  {
    id: 'gpl3',
    title: 'GNU GPL v3',
    text: `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.`,
  },
  {
    id: 'bsd3',
    title: 'BSD 3-Clause',
    text: `BSD 3-Clause License

Copyright (c) 2026, <PACKAGE_AUTHOR>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES ARE DISCLAIMED.`,
  },
  {
    id: 'anti-cheat',
    title: '自定义（个人/专用许可）',
    text: `最终用户许可协议 / End User License Agreement

版权所有 © 2026 <PACKAGE_AUTHOR>。保留所有权利。

本软件为个人及商业使用之目的开放安装。
安装和使用本软件即表示您同意以下条款：
1. 本软件仅许可您在授权设备上安装并使用。
2. 未经授权，禁止对本软件进行反向工程、再分发或商业转售。
3. 本软件按"现状"提供，作者不对任何直接或间接损失承担责任。`,
  },
];

/** 将模板中的占位符替换为实际内容 */
export function fillTemplate(text: string, author: string): string {
  return text.replace(/<PACKAGE_AUTHOR>/g, author || '<作者/公司>');
}
