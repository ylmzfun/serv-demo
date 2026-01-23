//detail.js
Page({
  data: {
    score: {}
  },
  onLoad: function(options) {
    const scoreId = options.scoreId
    this.getScoreDetail(scoreId)
  },
  getScoreDetail: function(scoreId) {
    wx.request({
      url: 'http://localhost:8080/api/scores/' + scoreId,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            score: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取成绩详情失败',
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
  }
})
