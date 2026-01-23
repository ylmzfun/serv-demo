//login.js
Page({
  data: {
    username: '',
    password: ''
  },
  onUsernameInput: function(e) {
    this.setData({
      username: e.detail.value
    })
  },
  onPasswordInput: function(e) {
    this.setData({
      password: e.detail.value
    })
  },
  onLogin: function() {
    if (!this.data.username || !this.data.password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      })
      return
    }
    // 这里应该调用登录API
    wx.request({
      url: 'http://localhost:8080/api/auth/login',
      method: 'POST',
      data: {
        username: this.data.username,
        password: this.data.password
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          // 保存token到全局变量
          getApp().globalData.token = res.data.data.token
          // 保存token到本地存储
          wx.setStorageSync('token', res.data.data.token)
          // 跳转回首页
          wx.switchTab({
            url: '/pages/index/index'
          })
        } else {
          wx.showToast({
            title: res.data.message || '登录失败',
            icon: 'none'
          })
        }
      },
      fail: function() {
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        })
      }
    })
  },
  onRegister: function() {
    // 跳转到注册页面（如果有的话）
    wx.showToast({
      title: '注册功能暂未开放',
      icon: 'none'
    })
  }
})
