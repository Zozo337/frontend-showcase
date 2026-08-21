const local: App.I18n.Schema = {
  system: {
    title: 'Soybean 管理系統',
    updateTitle: '系統版本更新通知',
    updateContent: '检测到系統有新版本发布，是否立即重新整理页面？',
    updateConfirm: '立即重新整理',
    updateCancel: '稍后再说'
  },
  common: {
    action: '操作',
    add: '新增',
    addSuccess: '添加成功',
    backToHome: '返回首頁',
    batchDelete: '批量刪除',
    cancel: '取消',
    close: '關閉',
    check: '勾选',
    selectAll: '全选',
    expandColumn: '展开列',
    columnSetting: '列設定',
    config: '配置',
    confirm: '確認',
    delete: '刪除',
    deleteSuccess: '刪除成功',
    confirmDelete: '確認刪除吗？',
    edit: '編輯',
    warning: '警告',
    error: '錯誤',
    index: '序号',
    keywordSearch: '請輸入关键词搜尋',
    logout: '退出登入',
    logoutConfirm: '確認退出登入吗？',
    lookForward: '敬請期待',
    modify: '修改',
    modifySuccess: '修改成功',
    noData: '无資料',
    operate: '操作',
    pleaseCheckValue: '請检查輸入的值是否合法',
    refresh: '重新整理',
    reset: '重設',
    search: '搜尋',
    switch: '切换',
    tip: '提示',
    trigger: '触发',
    update: '更新',
    updateSuccess: '更新成功',
    userCenter: '个人中心',
    yesOrNo: {
      yes: '是',
      no: '否'
    }
  },
  request: {
    logout: '請求失敗后登出使用者',
    logoutMsg: '使用者狀態失效，請重新登入',
    logoutWithModal: '請求失敗后弹出模态框再登出使用者',
    logoutWithModalMsg: '使用者狀態失效，請重新登入',
    refreshToken: '請求的token已过期，重新整理token',
    tokenExpired: 'token已过期'
  },
  theme: {
    themeDrawerTitle: '主題配置',
    tabs: {
      appearance: '外观',
      layout: '布局',
      general: '通用',
      preset: '预设'
    },
    appearance: {
      themeSchema: {
        title: '主題模式',
        light: '亮色模式',
        dark: '暗黑模式',
        auto: '跟随系統'
      },
      grayscale: '灰色模式',
      colourWeakness: '色弱模式',
      themeColor: {
        title: '主題顏色',
        primary: '主色',
        info: '資訊色',
        success: '成功色',
        warning: '警告色',
        error: '錯誤色',
        followPrimary: '跟随主色'
      },
      themeRadius: {
        title: '主題圆角'
      },
      recommendColor: '应用推荐算法的顏色',
      recommendColorDesc: '推荐顏色的算法参照',
      preset: {
        title: '主題预设',
        apply: '应用',
        applySuccess: '预设应用成功',
        default: {
          name: '預設预设',
          desc: 'Soybean 預設主題预设'
        },
        dark: {
          name: '暗色预设',
          desc: '适用于夜间使用的暗色主題预设'
        },
        compact: {
          name: '紧凑型',
          desc: '适用于小屏幕的紧凑布局预设'
        },
        azir: {
          name: 'Azir的预设',
          desc: '是 Azir 比较喜欢的莫兰迪色系冷淡风'
        }
      }
    },
    layout: {
      layoutMode: {
        title: '布局模式',
        vertical: '左侧選單模式',
        'vertical-mix': '左侧選單混合模式',
        'vertical-hybrid-header-first': '左侧混合-顶部优先',
        horizontal: '顶部選單模式',
        'top-hybrid-sidebar-first': '顶部混合-侧边优先',
        'top-hybrid-header-first': '顶部混合-顶部优先',
        vertical_detail: '左侧選單布局，選單在左，内容在右。',
        'vertical-mix_detail': '左侧双選單布局，一级選單在左侧深色区域，二级選單在左侧浅色区域。',
        'vertical-hybrid-header-first_detail':
          '左侧混合布局，一级選單在顶部，二级選單在左侧深色区域，三级選單在左侧浅色区域。',
        horizontal_detail: '顶部選單布局，選單在顶部，内容在下方。',
        'top-hybrid-sidebar-first_detail': '顶部混合布局，一级選單在左侧，二级選單在顶部。',
        'top-hybrid-header-first_detail': '顶部混合布局，一级選單在顶部，二级選單在左侧。'
      },
      tab: {
        title: '标签栏設定',
        visible: '顯示标签栏',
        cache: '标签栏資訊缓存',
        cacheTip: '离开页面后仍然保留标签栏資訊',
        height: '标签栏高度',
        mode: {
          title: '标签栏风格',
          slider: '滑块风格',
          chrome: '谷歌风格',
          button: '按钮风格'
        },
        closeByMiddleClick: '鼠标中键關閉标签页',
        closeByMiddleClickTip: '啟用后可以使用鼠标中键点击标签页进行關閉'
      },
      header: {
        title: '头部設定',
        height: '头部高度',
        breadcrumb: {
          visible: '顯示面包屑',
          showIcon: '顯示面包屑图标'
        }
      },
      sider: {
        title: '侧边栏設定',
        inverted: '深色侧边栏',
        width: '侧边栏宽度',
        collapsedWidth: '侧边栏折叠宽度',
        mixWidth: '混合布局侧边栏宽度',
        mixCollapsedWidth: '混合布局侧边栏折叠宽度',
        mixChildMenuWidth: '混合布局子選單宽度',
        autoSelectFirstMenu: '自动選擇第一个子選單',
        autoSelectFirstMenuTip: '点击一级選單时，自动選擇并导航到第一个子選單的最深层级'
      },
      footer: {
        title: '底部設定',
        visible: '顯示底部',
        fixed: '固定底部',
        height: '底部高度',
        right: '底部居右'
      },
      content: {
        title: '内容区域設定',
        scrollMode: {
          title: '滚动模式',
          tip: '主題滚动仅 main 部分滚动，外层滚动可携带头部底部一起滚动',
          wrapper: '外层滚动',
          content: '主体滚动'
        },
        page: {
          animate: '页面切换动画',
          mode: {
            title: '页面切换动画類型',
            'fade-slide': '滑动',
            fade: '淡入淡出',
            'fade-bottom': '底部消退',
            'fade-scale': '缩放消退',
            'zoom-fade': '渐变',
            'zoom-out': '闪现',
            none: '无'
          }
        },
        fixedHeaderAndTab: '固定头部和标签栏'
      }
    },
    general: {
      title: '通用設定',
      watermark: {
        title: '水印設定',
        visible: '顯示全螢幕水印',
        text: '自定义水印文本',
        enableUserName: '啟用使用者名水印',
        enableTime: '顯示目前時間',
        timeFormat: '時間格式'
      },
      multilingual: {
        title: '多語言設定',
        visible: '顯示多語言按钮'
      },
      globalSearch: {
        title: '全局搜尋設定',
        visible: '顯示全局搜尋按钮'
      }
    },
    configOperation: {
      copyConfig: '复制配置',
      copySuccessMsg: '复制成功，請替换 src/theme/settings.ts 中的变量 themeSettings',
      resetConfig: '重設配置',
      resetSuccessMsg: '重設成功'
    }
  },
  route: {
    login: '登入',
    403: '无權限',
    404: '页面不存在',
    500: '服务器錯誤',
    'iframe-page': '外链页面',
    home: '首頁'
  },
  page: {
    login: {
      common: {
        loginOrRegister: '登入 / 註冊',
        userNamePlaceholder: '請輸入使用者名',
        phonePlaceholder: '請輸入手機號碼',
        codePlaceholder: '請輸入验证码',
        passwordPlaceholder: '請輸入密碼',
        confirmPasswordPlaceholder: '請再次輸入密碼',
        codeLogin: '验证码登入',
        confirm: '確定',
        back: '返回',
        validateSuccess: '验证成功',
        loginSuccess: '登入成功',
        welcomeBack: '欢迎回来，{userName} ！'
      },
      pwdLogin: {
        title: '密碼登入',
        rememberMe: '记住我',
        forgetPassword: '忘记密碼？',
        register: '註冊帳號',
        otherAccountLogin: '其他帳號登入',
        otherLoginMode: '其他登入方式',
        superAdmin: '超级管理员',
        admin: '管理员',
        user: '普通使用者'
      },
      codeLogin: {
        title: '验证码登入',
        getCode: '获取验证码',
        reGetCode: '{time}秒后重新获取',
        sendCodeSuccess: '验证码发送成功',
        imageCodePlaceholder: '請輸入圖片验证码'
      },
      register: {
        title: '註冊帳號',
        agreement: '我已经仔细阅读并接受',
        protocol: '《使用者协议》',
        policy: '《隐私权政策》'
      },
      resetPwd: {
        title: '重設密碼'
      },
      bindWeChat: {
        title: '绑定微信'
      }
    },
    home: {
      branchDesc:
        '为了方便大家開發和更新合并，我们对main分支的代碼进行了精简，只保留了首頁選單，其余内容已移至example分支进行维护。预览地址顯示的内容即为example分支的内容。',
      greeting: '早安，{userName}, 今天又是充满活力的一天!',
      weatherDesc: '今日多云转晴，20℃ - 25℃!',
      projectCount: '專案数',
      todo: '待办',
      message: '消息',
      downloadCount: '下載量',
      registerCount: '註冊量',
      schedule: '作息安排',
      study: '学习',
      work: '工作',
      rest: '休息',
      entertainment: '娱乐',
      visitCount: '访问量',
      turnover: '成交额',
      dealCount: '成交量',
      projectNews: {
        title: '專案动态',
        moreNews: '更多动态',
        desc1: 'Soybean 在2021年5月28日建立了开源專案 soybean-admin!',
        desc2: 'Yanbowe 向 soybean-admin 提交了一个bug，多标签栏不会自适应。',
        desc3: 'Soybean 准备为 soybean-admin 的发布做充分的准备工作!',
        desc4: 'Soybean 正在忙于为soybean-admin写專案說明文档！',
        desc5: 'Soybean 刚才把工作台页面随便写了一些，凑合能看了！'
      },
      creativity: '创意'
    }
  },
  form: {
    required: '不能為空',
    userName: {
      required: '請輸入使用者名',
      invalid: '使用者名格式不正确'
    },
    phone: {
      required: '請輸入手機號碼',
      invalid: '手機號碼格式不正确'
    },
    pwd: {
      required: '請輸入密碼',
      invalid: '密碼格式不正确，6-18位字符，包含字母、数字、下划线'
    },
    confirmPwd: {
      required: '請輸入確認密碼',
      invalid: '两次輸入密碼不一致'
    },
    code: {
      required: '請輸入验证码',
      invalid: '验证码格式不正确'
    },
    email: {
      required: '請輸入信箱',
      invalid: '信箱格式不正确'
    }
  },
  dropdown: {
    closeCurrent: '關閉',
    closeOther: '關閉其它',
    closeLeft: '關閉左侧',
    closeRight: '關閉右侧',
    closeAll: '關閉所有',
    pin: '固定标签',
    unpin: '取消固定'
  },
  icon: {
    themeConfig: '主題配置',
    themeSchema: '主題模式',
    lang: '切换語言',
    fullscreen: '全螢幕',
    fullscreenExit: '退出全螢幕',
    reload: '重新整理页面',
    collapse: '折叠選單',
    expand: '展开選單',
    pin: '固定',
    unpin: '取消固定'
  },
  datatable: {
    itemCount: '共 {total} 条',
    fixed: {
      left: '左固定',
      right: '右固定',
      unFixed: '取消固定'
    }
  }
};

export default local;
