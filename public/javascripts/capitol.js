/**
 * Created by scheffela on 12/29/16.
 */
/*global $, console */

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

        $(this.$resultsTable).DataTable({
            //"iDisplayLength": 10,
            "order": [[0, "desc"]],
            "columns": [
                {"title": "Date"},
                {"title": "Spent"},
                {"title": "Income"}
            ],
            "columnDefs": [
                {
                    render: function (data, type, row, meta) {
                        return data;
                    },
                    targets: [0],
                    className: "cell_left",
                    width: "20%"
                },
                {
                    render: function (data, type, row, meta) {
                        return data;
                    },
                    targets: [1],
                    className: "cell_center",
                    width: "40%"
                },
                {
                    render: function (data, type, row, meta) {
                        return data;
                    },
                    className: "cell_center",
                    targets: [2],
                    width: "40%"
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
    initializeDataTable: function () {
        
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