/**
 * Created by scheffela on 12/29/16.
 */
/*global $, moment, console */

var Co = window.Co || {};

Co.ce = {

    /**
     * This function initializes the page. It fetches all the need Jquery objects for use later. I wires up the onchange
     * handler for the semantic ui checkbox filters. Initializes the semantic ui form object, adding in feild validation
     * and the onSuccess handler. Finally it sets up both data tables.
     *
     * @param {Object} d - the backing data for the datatable row
     * @return {Array} an array of the html chunks to be added underneath the data table row
     */
    init: function () {
        "use strict";
        this.$form = $('#signInForm');
        this.$resultsTable = $('#resultsTable');
        this.$ccTable = $('#ccTable');
        this.$igD = $('#igD');
        this.$cb = $('#cb');
        this.$igC = $('#igC');

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


        //Custom dataTable date sorters
        $.fn.dataTable.moment('YYYY MMM');
        $.fn.dataTable.moment('llll');


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
                {"title": "Average Transaction Value <br/> (Income - Spent) / Total Transactions"}
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
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    //Setup up export functionality
                    text: 'Export As JSON',
                    action: function ( e, dt, button, config ) {
                        var data = dt.buttons.exportData();

                        //{"2014-10": {"spent": "$200.00", "income": "$500.00"}

                        var expDat = data.body.map(function (value) {
                            var tmp = {};
                            tmp[moment(value[1], "YYYY MMM").format("YYYY-MM")] = {"spent": value[3], "income": value[4]};
                            return tmp;
                        });

                        $.fn.dataTable.fileSave(
                            new Blob( [ JSON.stringify(expDat) ] ),
                            'Export.json'
                        );
                    }
                }
            ]
        });

        /*
        * This event handler will expand the results data tables nested transactions rows if the image on the right is
        * toggled and hide them if it is toggled again.
         */
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
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    //Setup up export functionality
                    text: 'Export As JSON',
                    action: function ( e, dt, button, config ) {
                        var data = dt.buttons.exportData();
                        $.fn.dataTable.fileSave(
                            new Blob( [ JSON.stringify(data) ] ),
                            'Export.json'
                        );
                    }
                }
            ]
        });
    },

    /**
     * This function generates extra individual transaction for the results data table. Its a bit ugly, I know.
     *
     * @param {Object} d - the backing data for the datatable row
     * @return {Array} an array of the html chunks to be added underneath the data table row
     */
    genDtTableExtraRows : function( d ) {
        "use strict";
        var individTransAr = [];
        individTransAr.push($("<tr><td></td>" +
            "<td class='cell_center bolded'>Transaction Id</td>" +
            "<td class='cell_center bolded'>Merchant</td>" +
            "<td class='cell_center bolded'>Amount</td>" +
            "<td class='cell_center bolded'>Transaction Time</td>" +
            "</tr>")[0]);
        for(var i = 0; i < d.valArr.length; i++) {
            individTransAr.push($("<tr><td class='cell_center'>" + (i +1) + "</td>" +
                "<td class='cell_center'>" + d.valArr[i]["transaction-id"] + "</td>" +
                "<td class='cell_center'>" + d.valArr[i].merchant + "</td>" +
                "<td class='cell_center'> $" + (d.valArr[i].amount  / 10000).toFixed(2) + "</td>" +
                "<td class='cell_center'>" + d.valArr[i]["transaction-time"] + "</td>" +
                "</tr>")[0]);
        }
        return individTransAr;
    },

    /**
     * This function calls the external restful login service. If it succeeds its stores off the user's login
     * credentials, resets the form input fields, and calls the load all data function to fetch the transactions for
     * display. If it fails it updates the forms error message to indicate the failure.
     *
     * @param {Object} event - Unused, event that caused the login to occur
     * @param {Object} fields -  Object containing the form fields and their values
     */
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
    /**
     * This function uses a Jquery when to wait till both the users transaction and crystal ball transactions have been
     * fetched. If successful it will, sort/filter the fetched transactions, and reload the page's data tables. If
     * fails it will popup an alert window notify the user.
     *
     * @param {String} uid - The user's uid
     * @param {String} token - The user's token value
     */
    loadAllData : function (uid,token) {
        "use strict";
        $.when(this.loadData(uid,token),this.loadCBData(uid,token)).
        done(function( data, cbData) {
            if (data[1] === "success" && data[0] && data[0].error && data[0].error === "no-error" && data[0].transactions &&
                cbData[1] === "success" && cbData[0] && cbData[0].error && cbData[0].error === "no-error") {
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
    /**
     * This function is just a wrapped around a JQuery ajax post call to get all the transactions for a
     * given user.
     *
     * @param {String} uid - The user's uid
     * @param {String} token - The user's token value
     * @returns {Object} a deffered object to be used later.
     */
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
                data: JSON.stringify(postData)
            });
        }
    },
    /**
     * This function is just a wrapped around a JQuery ajax post call to get all the crystal ball transactions for a
     * given user.
     *
     * @param {String} uid - The user's uid
     * @param {String} token - The user's token value
     * @returns {Object} a deffered object to be used later.
     */
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
                data: JSON.stringify(postData)
            });
        }
    },
    /**
     * This function filters out CC transactions and returns an object with 2 properties one containing the CC
     * transactions and another containing the non CC transactions. The logic is relatively simple. I create a map of
     * arrays keyed off of the absolute transaction amount value. When a new transaction is processed, the map is checked
     * to see if other transactions with the same ABS amount value have been found before. If so the array values are
     * compared to see if a previous transaction has occurred within one day and if the values negate each other. If so
     * both transactions are filtered out and added to the CC array.
     *
     * @param {Array} transactions - All the transactions to process
     * @returns {Object} containing the 2 arrays, one for non CC's the other for CC's
     */
    trimOutCC : function(transactions) {
        "use strict";
        var transValMap = {}, retVal = {uptTransArray: [], ccTransArray : []};
        if(transactions && transactions.length) {

            for(var i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                if(transaction["transaction-time"] && typeof transaction.amount === "number") {
                    var amtString = Math.abs(transaction.amount).toString();

                    transaction.timeInMilli = new Date(transaction["transaction-time"]).getTime();
                    if (!transValMap[amtString]) {
                        transValMap[amtString] = [];
                        transValMap[amtString].push(transaction);
                    } else {
                        var foundCC = false;
                        for (var p = 0; p < transValMap[amtString].length; p++) {
                            if (transaction.amount === (transValMap[amtString][p].amount * -1) &&
                                Math.abs(transaction.timeInMilli - transValMap[amtString][p].timeInMilli) <= 86400000) {
                                retVal.ccTransArray.push(transaction);
                                retVal.ccTransArray.push(transValMap[amtString].splice(p, 1)[0]);
                                foundCC = true;
                                break;
                            }
                        }
                        if (!foundCC) {
                            transValMap[amtString].push(transaction);
                        }
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
    /**
     * This function is kind of the center of all the Logic. If processCbData is true and valid cbData has been passed
     * along it will append the cb data to the array of regular transaction data for processing. If ignore CC is true
     * it will call the trimOutCC function to remove any CC transactions. Finally if ignoreDonuts is true the code will
     * not evaluate any donut transactions.
     *
     * Once all the filtering has occurred the function builds out a map, keyed off the year-month value of the
     * transaction times. Each entry contains an array of all transactions for that year month,
     * the total number of transactions that occurred, total value of both the credits and debits, and a running total
     * for all transaction amounts for the month.
     *
     * @param {Array} transactions - All the transactions to process
     * @param {boolean} ignoreDonuts - Whether or not to process donut transactions
     * @param {boolean} processCbData - Whether or not to process crystal ball transactions
     * @param {Array} cbData - An array of crystal ball transactions
     * @param {boolean} ignoreCC - Whether or not to filter CC transactions
     *
     * @returns {Object} containing the CC transaction array if CC transactions were filtered, and the Transactions by
     * month map
     */
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
                if(!ignoreDonuts || (transaction.merchant.toLowerCase() !== "krispy kreme donuts" && transaction.merchant.toLowerCase() !== "dunkin #336784")) {
                    if (transaction["transaction-time"] && typeof transaction.amount === "number") {
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

    /**
     * This function initializes the pages 2 data tables updating their values or clearing them accordingly.
     * @param {Object} sortedTrans - An object with 2 arrays representing the transactions broken up by month and the filtered CC transactions
     */
    initializeDataTables: function (sortedTrans) {
        "use strict";
        this.dt.clear();
        if(sortedTrans.transByMonthMap) {
            //Datatables takes an array, to break down the map
            var array = $.map(sortedTrans.transByMonthMap, function(value, index) {
                return [value];
            });
            this.dt.rows.add(array).draw();
        } else {
            this.dt.rows.add([]).draw();
        }

        this.ccDt.clear();
        if(sortedTrans.ccTransArray) {
            this.ccDt.rows.add(sortedTrans.ccTransArray).draw();
        } else {
            this.ccDt.rows.add([]).draw();
        }

    }
};

$(function () {
    "use strict";
    Co.ce.init();
});