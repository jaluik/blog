---
id: cssTrick
title: css技巧
sidebar_label: css技巧
description: css技巧
keywords:
  - css
slug: /frontEnd/cssTrick
---

## CSS 技巧

修复 transform 动画结束时的异常抖动： 在父容器上增加`backface-visibility: hidden`

## CSS 易错点

- `line-height`是可以继承的，如果父元素的`line-height`设置的是百分比的单位，子元素继承的是父元素的实际`px`值，而不是继承了百分比的值
