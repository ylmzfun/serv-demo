//index.js
Page({
  data: {
    userInfo: {}
  },
  onLoad: function() {
    this.getUserInfo()
  },
  getUserInfo: function() {
    wx.request({
      url: 'http://localhost:8080/api/users/me',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            userInfo: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取用户信息失败',
            icon: 'none'
          })
        }
      }.bind(this),
      fail: function() {
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        })
      }
    })
  },
  onEditProfile: function() {
    // 跳转到编辑资料页面（如果有的话）
    wx.showToast({
      title: '编辑资料功能暂未开放',
      icon: 'none'
    })
  },
  onChangePassword: function() {
    // 跳转到修改密码页面（如果有的话）
    wx.showToast({
      title: '修改密码功能暂未开放',
      icon: 'none'
    })
  },
  onAbout: function() {
    // 跳转到关于我们页面（如果有的话）
    wx.showToast({
      title: '关于我们功能暂未开放',
      icon: 'none'
    })
  },
  onLogout: function() {
    // 清除token
    wx.removeStorageSync('token')
    getApp().globalData.token = null
    // 跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
})
