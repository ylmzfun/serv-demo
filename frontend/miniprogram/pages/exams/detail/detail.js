//detail.js
Page({
  data: {
    exam: {}
  },
  onLoad: function(options) {
    const paperId = options.paperId
    this.getExamDetail(paperId)
  },
  getExamDetail: function(paperId) {
    wx.request({
      url: 'http://localhost:8080/api/exams/' + paperId,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            exam: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取考试详情失败',
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
  onStartExam: function() {
    const paperId = this.data.exam.id
    wx.navigateTo({
      url: '/pages/exams/answer/answer?paperId=' + paperId
    })
  }
})
