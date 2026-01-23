//answer.js
Page({
  data: {
    paper: {},
    questions: [],
    remainingTime: 0,
    answers: {}
  },
  onLoad: function(options) {
    const paperId = options.paperId
    this.getPaperDetail(paperId)
  },
  getPaperDetail: function(paperId) {
    wx.request({
      url: 'http://localhost:8080/api/papers/' + paperId,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            paper: res.data.data,
            questions: res.data.data.questions,
            remainingTime: res.data.data.duration * 60
          })
          // 开始倒计时
          this.startCountdown()
        } else {
          wx.showToast({
            title: res.data.message || '获取试卷详情失败',
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
  startCountdown: function() {
    setInterval(function() {
      if (this.data.remainingTime > 0) {
        this.setData({
          remainingTime: this.data.remainingTime - 1
        })
      } else {
        // 时间到，自动提交
        this.onSubmit()
      }
    }.bind(this), 1000)
  },
  onOptionSelect: function(e) {
    const questionId = e.currentTarget.dataset.questionId
    const optionValue = e.currentTarget.dataset.value
    const answers = this.data.answers
    answers[questionId] = optionValue
    this.setData({
      answers: answers
    })
  },
  onEssayInput: function(e) {
    const questionId = e.currentTarget.dataset.questionId
    const answer = e.detail.value
    const answers = this.data.answers
    answers[questionId] = answer
    this.setData({
      answers: answers
    })
  },
  onSubmit: function() {
    const paperId = this.data.paper.id
    wx.request({
      url: 'http://localhost:8080/api/exams/submit',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      data: {
        paperId: paperId,
        answers: this.data.answers
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          })
          // 跳转到成绩页面
          wx.navigateTo({
            url: '/pages/scores/detail/detail?scoreId=' + res.data.data.id
          })
        } else {
          wx.showToast({
            title: res.data.message || '提交失败',
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
  }
})
