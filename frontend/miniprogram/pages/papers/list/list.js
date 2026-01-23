//list.js
Page({
  data: {
    papers: []
  },
  onLoad: function() {
    this.getPapers()
  },
  getPapers: function() {
    wx.request({
      url: 'http://localhost:8080/api/papers',
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            papers: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '获取试卷失败',
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
  onPaperTap: function(e) {
    const paperId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/exams/detail/detail?paperId=' + paperId
    })
  }
})
