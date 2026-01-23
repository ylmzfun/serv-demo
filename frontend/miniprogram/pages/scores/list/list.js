//list.js
Page({
  data: {
    scores: []
  },
  onLoad: function() {
    this.getScores()
  },
  getScores: function() {
    wx.request({
      url: 'http://localhost:8080/api/scores',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            scores: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取成绩失败',
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
  onScoreTap: function(e) {
    const scoreId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/scores/detail/detail?scoreId=' + scoreId
    })
  }
})
