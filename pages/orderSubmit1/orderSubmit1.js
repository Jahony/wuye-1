// pages/orderSubmit/orderSubmit.js
const app = getApp();
let goods, userId;
Page({

  data: {
    address: '', //地址
    baseUrl: app.globalData.baseUrl, //图片路径
    goods: [], //商品信息
    deliveryMoney: 0, //快递费用
    remark: '', //备注信息
    totalMoney: 0, //合计
    submit: true, //判断是否能提交订单
    showLoading: true
  },

  onLoad: function(options) {
    //从缓存中获取userId
    userId = wx.getStorageSync('userId');
    goods = app.globalData.goods;
    this.setData({
      goods: goods
    });
    console.log(app.globalData.goods);
    //计算快递费用
    let deliveryMoney = 0;
    for (var i = 0; i < goods.length; i++) {
      deliveryMoney = deliveryMoney * 1 + goods[i][0].deliveryMoney * 1;
    }
    this.setData({
      deliveryMoney: deliveryMoney
    });
    console.log(deliveryMoney);
    //合计费用
    let totalMoney = 0;
    for (var i = 0; i < goods.length; i++) {
      for (var k = 0; k < goods[i].length; k++) {
        totalMoney = totalMoney * 1 + goods[i][k].shopPrice * 1 * goods[i][k].shopNumber;
      }
    }
    let totalMoneys = totalMoney * 1 + deliveryMoney * 1;
    console.log(totalMoneys);
    this.setData({
      totalMoney: totalMoneys
    });
  },
  onShow() {
    this.setData({
      address: ''
    });
    if (!app.globalData.address) {
      //获取默认地址接口
      wx.request({
        method: 'POST',
        url: `${app.globalData.api}Users/getUserAddress`,
        header: { 'content-type': 'application/x-www-form-urlencoded' },
        data: {
          userId: userId,
          isDefault: 1
        },
        success: res => {
          console.log(res);
          this.setData({
            showLoading: false
          });
          if (!res.data.data || res.data.data.length != 0) {
            this.setData({
              address: res.data.data[0],
            });
          }
        },
        fail: res => {
          this.setData({
            showLoading: false
          });
          console.log(res);
        }
      });
    } else {
      this.setData({
        address: app.globalData.address,
        showLoading: false
      });
    }
  },
  //分享
  onShareAppMessage: function(res) {
    return {
      title: app.globalData.applet,
      path: 'pages/start/start'
    };
  },
  //提交订单
  bindSubmit() {
    //判断是否是重复提交订单
    if (this.data.submit == true) {
      if (!this.data.address) {
        wx.showToast({
          title: '请选择收货地址',
          icon: 'none',
          duration: 1500
        })
      } else {
        this.setData({
          submit: false
        });
        //把数据封装后台成需要的json格式
        let shops = []; //商品信息数组
        console.log(this.data.goods);
        for (var i = 0; i < this.data.goods.length; i++) {
          for (var k = 0; k < this.data.goods[i].length; k++) {
            shops = shops.concat({
              id: this.data.goods[i][k].id,
              cnt: this.data.goods[i][k].shopNumber,
              goodsAttr: this.data.goods[i][k].guigeArray,
            });
          }
        }
        //把数组转化为json
        let shopJson = JSON.stringify(shops);
        //选择的地址ID
        let addressId = this.data.address.addressId;
        //备注信息
        let remarks = this.data.remark;
        console.log(shops, addressId, userId, remarks);
        //发起微信支付
        //支付成功后调下单接口
        this.setData({
          showLoading: true
        });
        wx.request({
          method: 'POST',
          url: `${app.globalData.api}Panics/submitPanicOrder`,
          header: { 'content-type': 'application/x-www-form-urlencoded' },
          data: {
            userId: userId,
            consigneeId: addressId,
            remarks: remarks,
            goodsData: shopJson
          },
          success: res => {
            console.log(res);
            console.log({
              userId: userId,
              consigneeId: addressId,
              remarks: remarks,
              goodsData: shopJson
            });
            this.setData({
              showLoading: false
            });
            if (res.data.status == 1) {
              //发起微信支付
              wx.requestPayment({
                timeStamp: res.data.timeStamp.toString(),
                nonceStr: res.data.nonceStr,
                paySign: res.data.paySign,
                package: res.data.package,
                signType: 'MD5',
                success: res => {
                  //console.log(res);
                  //支付成功后
                  if (res.errMsg == 'requestPayment:ok') {
                    wx.showToast({
                      title: '支付成功',
                      icon: 'success',
                      duration: 1500
                    });
                    setTimeout(res => {
                      wx.redirectTo({
                        url: '../orderList/orderList'
                      })
                    }, 500);
                  } else {
                    //支付失败后
                    this.setData({
                      submit: true
                    });
                    wx.showToast({
                      title: '网络异常',
                      icon: 'none',
                      duration: 1500
                    });
                  }
                },
                fail: res => {
                  this.setData({
                    showLoading: true
                  });
                  //取消支付
                  if (res.errMsg == 'requestPayment:fail cancel') {
                    setTimeout(res => {
                      wx.redirectTo({
                        url: '../orderList/orderList'
                      })
                    }, 100);
                  }
                }
              });
            } else {
              //接口状态错误
              this.setData({
                submit: true
              });
              wx.showToast({
                title: res.data.msg,
                icon: 'none',
                duration: 1500
              });
            }
          },
          fail: res => {
            this.setData({
              submit: true,
              showLoading: false
            });
            console.log(res);
          }
        });
      }
    }
  },
  //备注信息
  bindText(e) {
    this.setData({
      remark: e.detail.value
    });
  },
  //点击跳转店铺详情
  bindShops(e) {
    console.log(e);
    let shopid = e.currentTarget.dataset.shopid;
    wx.navigateTo({
      url: `../malldetails/malldetails?shopid=${shopid}`
    })
  },
  //点击跳转地址列表
  bindAddress() {
    wx.navigateTo({
      url: '../address/address?type=1'
    })
  },
});