/**
 * Created by scheffela on 12/29/16.
 */
/*global $, moment, console */

var Co = window.Co || {};

Co.ce = {
    init: function () {
        "use strict";
        this.$form = $('#signInForm');
        //this.$menu = $('.menu .item');
        this.$resultsTable = $('#resultsTable');

        //this.$menu.tab({
        //    onVisible : this.tabVisible
        //});

        this.$form.form({
            fields: {
                username: {
                    identifier: 'username',
                    rules: [
                        {
                            type: 'email',
                            prompt: 'Please enter a valid username'
                        }
                    ]
                },
                password: {
                    identifier: 'password',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Please enter a password'
                        }
                    ]
                }
            },
            onSuccess: this.login
        });

        $.fn.dataTable.moment('YYYY-MM');
        this.dt = this.$resultsTable.DataTable({
            //"iDisplayLength": 10,
            "order": [[0, "desc"]],
            "columns": [
                {"title": "Date", "data" : "timeString"},
                {"title": "Total Transactions", "data" : "totalTransCount"},
                {"title": "Spent", "data" : "totalSpent"},
                {"title": "Income", "data" : "totalIncome"},
                {"title": "Average"}
            ],
            "columnDefs": [
                {
                    render: function (data, type, row, meta) {
                        return moment(data, "YYYY-MM").format("YYYY MMM");
                    },
                    targets: [0],
                    className: "cell_center",
                    width: "20%"
                },
                {
                    targets: [1],
                    className: "cell_center",
                    width: "10%"
                },
                {
                    render: function (data, type, row, meta) {
                        return (data / 10000);
                    },
                    targets: [2,3],
                    className: "cell_center",
                    width: "20%"
                },
                {
                    render: function (data, type, row, meta) {
                        return ((row.totalTransValue / 10000) / row.totalTransCount).toFixed(2);
                    },
                    className: "cell_center",
                    targets: [4],
                    width: "30%"
                }
            ]
        });
    },
    login: function (event, fields) {
        "use strict";
        Co.ce.credentials = {};
        if(fields.username && fields.password) {
            var postData = {
                "email": fields.username,
                "password": fields.password,
                "args": {
                    "api-token": "AppTokenForInterview"
                }
            };
            $.ajax({
                url: 'https://2016.api.levelmoney.com/api/v2/core/login',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(postData),
                success: function (data, textStatus, jqXHR) {
                    if (data && data.error && data.error === "no-error" && data.token && data.uid) {
                        Co.ce.credentials = data;
                        // Co.ce.$menu.tab("change tab","results");
                        Co.ce.$form.form('reset');
                        Co.ce.loadData(data.uid,data.token);
                    } else {
                        Co.ce.$form.form('add errors', ["Invalid login credentials"]);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    Co.ce.$form.form('add errors', ["Invalid login credentials"]);
                }
            });
        }
    },
    loadData : function (uid,token) {
        "use strict";
        if(uid && token) {
            var postData = {
                "args": {
                    "uid": uid,
                    "token": token,
                    "api-token": "AppTokenForInterview"
                }
            };
            $.ajax({
                url: 'https://2016.api.levelmoney.com/api/v2/core/get-all-transactions',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(postData),
                success: function (data, textStatus, jqXHR) {
                    if (data && data.error && data.error === "no-error" && data.transactions) {
                        Co.ce.transData = data.transactions;
                        Co.ce.transByMonthMap = Co.ce.sortTransByMonth(data.transactions);
                        Co.ce.initializeDataTable(Co.ce.transByMonthMap);
                    } else {
                        window.alert("Failed to get all transaction data");
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    window.alert("Failed to get all transaction data");
                }
            });
        }
    },
    sortTransByMonth: function (transactions) {
        "use strict";
        var transByMonthMap = {};
        if(transactions && transactions.length) {
            for(var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                if(transaction["transaction-time"]) {
                    var tmp = new Date(transaction["transaction-time"]);
                    var timeString = tmp.getFullYear() + "-" + (tmp.getMonth() + 1);
                    if(!transByMonthMap[timeString]) {
                        transByMonthMap[timeString] = {
                            "timeString" : timeString,
                            "valArr" : [],
                            "totalTransCount" : 0,
                            "totalTransValue" : 0,
                            "totalIncome" : 0,
                            "totalSpent" : 0
                        };
                    }
                    transByMonthMap[timeString].valArr.push(transaction);
                    transByMonthMap[timeString].totalTransCount++;
                    transByMonthMap[timeString].totalTransValue += transaction.amount;
                    if(transaction.amount > 0) {
                        transByMonthMap[timeString].totalIncome += transaction.amount;
                    } else {
                        transByMonthMap[timeString].totalSpent += transaction.amount;
                    }
                }
            }
        }
        return transByMonthMap;
    },
    initializeDataTable: function (transByMonthMap) {
        "use strict";
        var array = $.map(transByMonthMap, function(value, index) {
            return [value];
        });
        this.dt.clear();
        this.dt.rows.add(array).draw();
    }
    
    //tabVisible : function (tabPath, parameterArray, historyEvent) {
    //    if(tabPath && tabPath === "results") {
    //        console.log("results");
    //    }
    //}
};

$(function () {
    "use strict";
    Co.ce.init();
});