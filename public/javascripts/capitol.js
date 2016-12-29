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
        this.$ccTable = $('#ccTable');
        this.$igD = $('#igD');
        this.$cb = $('#cb');
        this.$igC = $('#igC');

        //this.$menu.tab({
        //    onVisible : this.tabVisible
        //});

        $(".ui.checkbox").checkbox({
            onChange : function (element) {
                var sortedTrans = Co.ce.sortTransByMonth(Co.ce.transData, Co.ce.$igD[0].checked,
                    Co.ce.$cb[0].checked, Co.ce.cbtransData, Co.ce.$igC[0].checked);
                Co.ce.initializeDataTables(sortedTrans);
            }
        });

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
        $.fn.dataTable.moment('YYYY-MM-DDTHH:mm:ssZ');
        this.dt = this.$resultsTable.DataTable({
            "iDisplayLength": 50,
            "order": [[1, "desc"]],
            "columns": [
                {
                    className : 'details-control',
                    orderable : false,
                    data : null,
                    defaultContent : ''
                },
                {"title": "Date", "data" : "timeString"},
                {"title": "Total Transactions", "data" : "totalTransCount"},
                {"title": "Spent", "data" : "totalSpent"},
                {"title": "Income", "data" : "totalIncome"},
                {"title": "Average Transaction Value"}
            ],
            "columnDefs": [
                {
                    render: function (data, type, row, meta) {
                        return moment(data, "YYYY-MM").format("YYYY MMM");
                    },
                    targets: [1],
                    className: "cell_center",
                    width: "20%"
                },
                {
                    targets: [2],
                    className: "cell_center",
                    width: "10%"
                },
                {
                    render: function (data, type, row, meta) {
                        var value = (data / 10000);
                        return "$" + (value > 0 ? value : (value*-1)).toFixed(2) ;
                    },
                    targets: [3,4],
                    className: "cell_center",
                    width: "20%"
                },
                {
                    render: function (data, type, row, meta) {
                        return "$" +((row.totalTransValue / 10000) / row.totalTransCount).toFixed(2);
                    },
                    className: "cell_center",
                    targets: [5],
                    width: "30%"
                }
            ]
        });

        this.$resultsTable.on('click', 'td.details-control', {parent : this}, function (event) {
            var tr = $(this).closest('tr');
            var row = event.data.parent.dt.row( tr );

            if ( row.child.isShown() ) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            }
            else {
                // Open this row
                row.child( event.data.parent.genDtTableExtraRows(row.data())).show();
                tr.addClass('shown');
            }
        } );

        this.ccDt = this.$ccTable.DataTable({
            "iDisplayLength": 50,
            "responsive": true,
            "order": [[1, "asc"]],
            "columns": [
                {"title": "Transaction Id", "data" : "transaction-id", "responsivePriority": 0 },
                {"title": "Transaction Time", "data" : "transaction-time", "responsivePriority": 0},
                {"title": "Merchant", "data" : "merchant", "responsivePriority": 1},
                {"title": "Categorization", "data" : "categorization", "responsivePriority": 2},
                {"title": "Amount", "data" : "amount", "responsivePriority": 0},
                {"title": "Account Id", "data" : "account-id", "responsivePriority": 3}
            ],
            "columnDefs": [
                {
                    targets: [0,1,2,3,4],
                    className: "cell_center"
                },
                {
                    render: function (data, type, row, meta) {
                        return moment(data, "YYYY-MM-DDTHH:mm:ssZ").format("llll");
                    },
                    targets: [1],
                    className: "cell_center"
                },
                {
                    render: function (data, type, row, meta) {
                        var value = (data / 10000);
                        return "$" + value.toFixed(2);
                    },
                    targets: [4],
                    className: "cell_center"
                }
            ]
        });
    },
    genDtTableExtraRows : function( d ) {
        "use strict";
        var individTransAr = [];
        individTransAr.push($("<tr><td></td><td class='cell_center bolded'>Transaction Id</td><td class='cell_center bolded'>Merchant" +
            "</td><td class='cell_center bolded'>Amount</td><td class='cell_center bolded'>Transaction Time</td></tr>")[0]);
        for(var i = 0; i < d.valArr.length; i++) {
            individTransAr.push($("<tr><td class='cell_center'>" + (i +1) + "</td><td class='cell_center'>" + d.valArr[i]["transaction-id"] + "</td><td class='cell_center'>" + d.valArr[i].merchant +
                "</td><td class='cell_center'> $" + (d.valArr[i].amount  / 10000).toFixed(2) + "</td><td class='cell_center'>" + d.valArr[i]["transaction-time"] +
                "</td></tr>")[0]);
        }
        return individTransAr;
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
                        Co.ce.loadAllData(data.uid,data.token);
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
    loadAllData : function (uid,token) {
        "use strict";
        $.when(this.loadData(uid,token),this.loadCBData(uid,token)).
        done(function( data, cbData) {
            if (data[0] && data[0].error && data[0].error === "no-error" && data[0].transactions &&
                cbData[0] && cbData[0].error && cbData[0].error === "no-error") {
                Co.ce.transData = data[0].transactions;
                Co.ce.cbtransData = cbData[0].transactions;
                var sortedTrans = Co.ce.sortTransByMonth(Co.ce.transData, Co.ce.$igD[0].checked,
                    Co.ce.$cb[0].checked, Co.ce.cbtransData, Co.ce.$igC[0].checked);
                Co.ce.initializeDataTables(sortedTrans);
            } else {
                window.alert("Failed to get all transaction data");
            }
        });
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
            return $.ajax({
                url: 'https://2016.api.levelmoney.com/api/v2/core/get-all-transactions',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(postData),
            });
        }
    },
    loadCBData : function (uid,token) {
        "use strict";
        if(uid && token) {

            var today =  new Date(), postData = {
                "year" : today.getFullYear(),
                "month" : today.getMonth() + 1,
                "args": {
                    "uid": uid,
                    "token": token,
                    "api-token": "AppTokenForInterview"
                }
            };
            return $.ajax({
                url: 'https://2016.api.levelmoney.com/api/v2/core/projected-transactions-for-month',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(postData),
            });
        }
    },
    trimOutCC : function(transactions) {
        "use strict";
        var transValMap = {}, retVal = {uptTransArray: [], ccTransArray : []};
        if(transactions && transactions.length) {

            for(var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                var amtString = Math.abs(transaction.amount).toString();

                transaction.timeInMilli = new Date(transaction["transaction-time"]).getTime();
                if(!transValMap[amtString]) {
                    transValMap[amtString] = [];
                    transValMap[amtString].push(transaction);
                } else {
                    var foundCC = false;
                    for(var p = 0; p < transValMap[amtString].length; p++) {
                        if(transaction.amount === (transValMap[amtString][p].amount * -1) &&
                            Math.abs(transaction.timeInMilli - transValMap[amtString][p].timeInMilli) <= 86400000) {
                            retVal.ccTransArray.push(transaction);
                            retVal.ccTransArray.push(transValMap[amtString].splice(p,1)[0]);
                            foundCC = true;
                            break;
                        }
                    }
                    if(!foundCC) {
                        transValMap[amtString].push(transaction);
                    }
                }
            }

            for(var key in transValMap) {
                if (Object.prototype.hasOwnProperty.call(transValMap, key)) {
                    retVal.uptTransArray = retVal.uptTransArray.concat(transValMap[key]);
                }
            }

        }
        return retVal;
    },
    sortTransByMonth: function (transactions, ignoreDonuts, processCbData, cbData, ignoreCC) {
        "use strict";
        // var transByMonthMap = {};
        var retVal = {transByMonthMap : {}, ccTransArray : null };

        if(processCbData && cbData && cbData.length) {
            transactions = transactions.concat(cbData);
        }

        if(ignoreCC) {
            var trimmedCCres = this.trimOutCC(transactions);
            transactions = trimmedCCres.uptTransArray;
            retVal.ccTransArray = trimmedCCres.ccTransArray;
        }


        if(transactions && transactions.length) {
            for(var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                if(!ignoreDonuts || (transaction.merchant !== "Krispy Kreme Donuts" && transaction.merchant !== "DUNKIN #336784")) {
                    if (transaction["transaction-time"]) {
                        var tmp = new Date(transaction["transaction-time"]);
                        var timeString = tmp.getFullYear() + "-" + (tmp.getMonth() + 1);
                        if (!retVal.transByMonthMap[timeString]) {
                            retVal.transByMonthMap[timeString] = {
                                "timeString": timeString,
                                "valArr": [],
                                "totalTransCount": 0,
                                "totalTransValue": 0,
                                "totalIncome": 0,
                                "totalSpent": 0
                            };
                        }
                        retVal.transByMonthMap[timeString].valArr.push(transaction);
                        retVal.transByMonthMap[timeString].totalTransCount++;
                        retVal.transByMonthMap[timeString].totalTransValue += transaction.amount;
                        if (transaction.amount > 0) {
                            retVal.transByMonthMap[timeString].totalIncome += transaction.amount;
                        } else {
                            retVal.transByMonthMap[timeString].totalSpent += transaction.amount;
                        }
                    }
                }
            }
        }
        return retVal;
    },
    initializeDataTables: function (sortedTrans) {
        "use strict";
        this.dt.clear();
        if(sortedTrans.transByMonthMap) {
            var array = $.map(sortedTrans.transByMonthMap, function(value, index) {
                return [value];
            });
            this.dt.rows.add(array).draw();
        }

        this.ccDt.clear();
        if(sortedTrans.ccTransArray) {
            this.ccDt.rows.add(sortedTrans.ccTransArray).draw();
        } else {
            this.ccDt.rows.add([]).draw();
        }

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