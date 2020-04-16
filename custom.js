/**
 * SINOVATE Web Wallet Client Side
 * Author : Charly
 * Description: custom JavaScript to connect with backend, get info...
 */

/**
 * Global variable
 */
var bitcore = require('bitcore-lib');
var wallet = null;
var backend = null;
var ui = null;
/**
 * Global configuration
 */
var configs = {
    //wallet
    address: '',
    cipherTxt: '',
    vSalt: '',
    rounds: '',
    status: 0,
    level: 0,
    errorcode: 0,
    relayfee_per_kb: 25000000,
    rawtx: null,
    coin: 100000000,
    collateral: 10000,
    voteAmount: 1,
    proposalAmount: 100,
    sinBurnAddress: "SinBurnAddress123456789SuqaXbx3AMC",
    sinMetaAddress: "SinBurnAddressForMetadataXXXXEU2mj",
    sinNotificationAddress: "SinBurnAddressForNotifyXXXXXc42TcT",
    sinGovernanceAddress: "SinBurnAddressGovernanceVoteba5vkQ",
}

/**
 * Global UI control varible
 */
var ui_config = {
    // coincontrol
    coincontrol_expanded: false,
    nav_tab: 0, //when inputs are verified, button createTx will be affect to follow the nav_tab: create send coin tx, vote, payment...
}

/**
 * Global Constant message
 */
const errorMessages = {
    "0": "OK",
    "StatusOK": "OK",
    "UnknownNav": "Unknown action detected!",
    "ReadJSONError": "Cannot open or read your local JSON file.",
    "ReadJSONNotPermission": "File could not be read!",
    "ImportKeyFile": "Please import your key file to open web wallet!",
    "ImportKeyContentError": "Error reading the CONTENT of key file.",
    "ImportAddressError": "Error reading the SIN address.",
    "WalletOpenLevel1": "Wallet is open with Level 1 (Watch only).",
    "WalletOpenLevel2": "Wallet is open with Level 2 (Full control IF you have your Passphrase).",
    "WalletBalanceKO": "Cannot get balance for address. Network issue!",
    "WalletNULL": "Internal error. Please open your wallet again!",
    "WalletAmountTooBig": "You cannot create a transaction with amount superior than your balance!",
    "WalletAmountTooSmall": "You cannot create a transaction with amount too small.",
    "CoinControlUpdated": "Coin control is updated",
    "CoinControlNULL": "No coin selected. Please open your wallet and select at least 1 coin!",
    "CoinControlSelectCoin": "Amount is superior than total selected coin. Please select more...!",
    "CoinControlSelectEmpty": "No coin found in your wallet.",
    "CoinControlSelectAmountNULL": "Please enter an amount to send.",
    "CoinControlSelectAmountTooBig": "Please enter an amount inferior than your balance.",
    "CoinControlVerifying": "Please wait...",
    "CoinControlVerifyOK": "Verify finished. You can create a tx.",
    "CoinControlVerifyKO": "Verify finished with error! Please reopen your wallet.",
    "DestinationAddressError": "Destination Address is not in SIN format.",
    "CreateTx": "Create transaction...",
    "CreateTxOffline": "Transaction can be created in offline mode ",
    "CreateTxKO": "Error when creating a transaction. Passphrase is unset and will be required next time!",
    "CreateTxKOLevel1": "Error when creating a transaction. Wallet is open with Level 1 (Watch only). Please open with your Keyfile",
    "ProposalFormatKO": "Proposal must be a number between 10000000 and 99999999.",
    "InvoiceInfoFormatKO": "Invoice's information is not allowed.",
    "InvoiceInfoFormatNull": "Please use Send coin option if you don't pay a merchant.",
    "ProposalOpinionKO": "Proposal opinion must be Yes or No.",
    "ProposalFromHeightInt": "Proposal must begin(From) at Integer height of blockchain.",
    "ProposalToHeightInt": "Proposal must end(To) at Integer height and superior than begin(From) height of blockchain.",
    "ProposalVoteFee": "Vote fee must be an integer and superior than limit " + configs.voteAmount + " SIN.",
    "CreateMultiSigAddressKO": "Cannot create a MultiSignature address from inputs.",
    "CreateMultiSigReadKeysKO": "Cannot read all inputs from public key.",
    "SignTxWithLevelKO": "Cannot try to sign a transaction with this level.",
    "SignMultiSigRequire": "Transaction needs more signature to get valid state.",
    "SendTxNull": "Please create your transaction...",
    "SendTxCommited": "Transaction is broadcasted  to the network with success!",
}

/**
 * Global Constant defaults network parameters
 */
const defaults = {
    //Backend server
    url: 'https://mobile.sinovate.io/api/SinovateAPI.php',
    url_proposal: 'https://mobile.sinovate.io/SinovateProposal.php',
    version: 'v1',
    timeout: 5000,
}

const methods = {
    public: ['utxo', 'sendtx', 'tx', 'sendproposal']
};

/**
 * Show Error message in HTML page
 * @param: {String} errorcode
 * @param: {Integer} code
 */
function showError(errocode, code) {
    if (errocode in errorMessages) {
        if (code == 1) {
            $('#error').css('background', 'yellow');
            $('#error').css('color', 'black');
        } else if (code > 1) {
            $('#error').css('background', 'red');
            $('#error').css('color', 'white');
        } else {
            $('#error').css('background', 'green');
            $('#error').css('color', 'white');
        }
        $('#error').html(errorMessages[errocode]);
        $('#error').show();
    }
}

/**
 * Send raw request and get data result
 * @param: url
 * @param: header
 * @param: data
 * @param: timeout (option)
 */
async function rawRequest(url, headers, data, timeout) {
    var result;
    const options = {
        method: headers['method'],
        version: headers['version'],
        data: JSON.stringify(data)
    };
    try {
        result = await $.ajax({
            type: "POST",
            url: url,
            data: options,
            dataType: 'json'
        });
        return result;
    } catch (error) {
        showError("WalletBalanceKO");
    }
};

/**
 * Backend class is used to connect with outside server to get balance and commit transaction
 * Method: utxo, address
 */
class Backend {
    constructor(options) {
        if (typeof options === 'string') {
            options = {
                otp: options
            };
        }
        this.config = Object.assign(defaults, options);
    }

    /**
     * This method makes a public or private API request.
     * @param  {String}   method   The API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @param  {Function} callback A callback function to be executed when the request is complete
     * @return {Object}            The request object
     */
    async api(method, params, callback) {
        // Default params to empty object
        if (typeof params === 'function') {
            callback = params;
            params = {};
        }

        if (methods.public.includes(method)) {
            return await this.publicMethod(method, params, callback);
        } else {
            throw new Error(method + ' is not a valid API method.');
        }
    }

    /**
     * This method makes a public API request.
     * @param  {String}   method   The API method (public or private)
     * @param  {Object}   params   Arguments to pass to the api call
     * @param  {Function} callback A callback function to be executed when the request is complete
     * @return {Object}            The request object
     */
    async publicMethod(method, params, callback) {
        params = params || {};
        // Default params to empty object
        if (typeof params === 'function') {
            callback = params;
            params = {};
        }

        const headers = {
            'method': method,
            'version': this.config.version
        };

        var url = this.config.url;
        if (method == 'sendproposal') {
            url = this.config.url_proposal;
        }


        return await rawRequest(url, headers, params, this.config.timeout);
    }
}
//Declaration of global variable backend
backend = new Backend();

/**
 * Backend class is used to connect with outside server to get balance and commit transaction
 * Method: utxo, address
 */
class UI {
    /**
     * update IHM by ID
     * @param {String}              ID
     * @param {String}              Value
     * @param {String} ( optional)  css 
     */
    htmlUpdate(id, value, option = '') {
        $('#' + id).html(value);
    }

    htmlInsertHTMLElement(id, htmlcode) {
        $('#' + id).append(htmlcode);
    }

    /**
     * user open coin control. Get all coins of user from backend
     */
    htmlUpdateCoinControl() {
        if (!ui_config.coincontrol_expanded) {
            if (wallet == null) {
                this.htmlUpdate('coincontrol', '');
            } else {
                var coinList = wallet.getCoins();
                if (typeof coinList !== 'undefined' & coinList.length > 0) {
                    $('#coincontrol').html('');
                    for (var i = 0; i < coinList.length; i++) {
                        if (coinList[i].amount > 0 && coinList[i].amount != configs.collateral) {
                            this.htmlInsertHTMLElement('coincontrol', '<label for="coin' + i + '"><input type="checkbox" id="' + coinList[i].txid + '' + coinList[i].vout +
                                '" onchange="ui.htmlCoinControlSelectedManual(\'' + coinList[i].txid + '-' + coinList[i].vout + '\');"/>' + coinList[i].amount + '</label>');
                        }
                    }
                }

                var coinsSelected = wallet.getCoinsControlSelected();
                if (typeof coinsSelected !== 'undefined' & coinsSelected.length > 0) {
                    for (var i = 0; i < coinsSelected.length; i++) {
                        $('#' + coinsSelected[i].txid + '' + coinsSelected[i].vout).prop("checked", true);
                    }
                }
            }
            $('#coincontrol').css("display", "block");
            ui_config.coincontrol_expanded = true;
        } else {
            $('#coincontrol').css("display", "none");;
            ui_config.coincontrol_expanded = false;
        }
    }

    htmlUpdateCoinControlFromAmount(amount) {
        if (wallet.getCoins().length <= 0) {
            showError("CoinControlSelectEmpty", 1);
            return false;
        }
        if (amount > 0) {} else {
            amount = $('#txAmount').val();
        }
        if (amount == '' || amount == null) {
            showError("CoinControlSelectAmountNULL", 1);
            return false;
        }
        if (parseFloat(amount) > wallet.getBalance()) {
            showError("CoinControlSelectAmountTooBig", 1);
            return false;
        };
        if (0 < parseFloat(amount) && parseFloat(amount) < wallet.getBalance()) {
            if (wallet.coinsControlSelectForAmount(parseFloat(amount))) {
                this.htmlUpdate('coincontrol_selected', wallet.calculBalance(wallet.getCoinsControlSelected()));
                showError("CoinControlUpdated", 0);
            } else {
                showError("WalletNULL", 2);
            }
        }
    }

    /**
     * update selected coin in Array and put amount: sum of all selected coins available on HTML
     * @param {String} txid
     */
    htmlCoinControlSelectedManual(txid) {
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            wallet.coinsControlSelected(txid);
            if (wallet == null) {
                this.htmlUpdate('coincontrol_selected', 0);
            } else {
                this.htmlUpdate('coincontrol_selected', wallet.calculBalance(wallet.getCoinsControlSelected()));
            }
        }
    }

    /**
     * check input address enter by user is SIN address
     */
    htmlCheckInputAddress(event) {
        var input = event.target.value;
        if (!bitcore.Address.isValid(input, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
            !bitcore.Address.isValid(input, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
            showError("DestinationAddressError", 2);
            return false;
        } else {
            $('#error').hide();
        }
    }

    /**
     * check input for invoice
     */
    htmlCheckInputInvoiceInfo(event) {
        var input = event.target.value;
        if (input.length > 0 && input.length <= 80) {
            var regex = /^[a-zA-Z0-9;!@#\$%\^\&*\)\(+=._-]+$/g;
            if (!regex.test(input)) {
                showError("InvoiceInfoFormatKO", 2);
                return false;
            } else {
                $('#error').hide();
            }
        } else if (input.length == 0) {
            showError("InvoiceInfoFormatNull", 1);
            return false;
        } else {
            showError("InvoiceInfoFormatKO", 2);
            return false;
        }
    }
    /**
     * check input proposal
     */
    htmlCheckInputProposalFormat(event) {
        var input = event.target.value;
        if (10000000 <= input && input <= 99999999) {
            $('#error').hide();
        } else {
            showError("ProposalFormatKO", 2);
            return false;
        }
    }
    /**
     * check input proposal Height
     */
    htmlCheckInputProposal(id) {
        if (id == 'fromHeight') {
            var fromHeight = parseInt($('#fromHeight').val());
            if (!Number.isInteger(fromHeight)) {
                showError("ProposalFromHeightInt", 2);
                return false;
            }
        }
        if (id == 'toHeight') {
            var fromHeight = parseInt($('#fromHeight').val());
            var toHeight = parseInt($('#toHeight').val());
            if (!Number.isInteger(fromHeight)) {
                showError("ProposalFromHeightInt", 2);
                return false;
            }
            if (!Number.isInteger(toHeight) || (toHeight < fromHeight)) {
                showError("ProposalToHeightInt", 2);
                return false;
            }
        }
        if (id == 'voteFee') {
            var voteFee = parseInt($('#voteFee').val());
            if (!Number.isInteger(voteFee) || (voteFee < 1)) {
                showError("ProposalVoteFee", 2);
                return false;
            }
        }
        $('#error').hide();
        return true;
    }
    /**
     * check input for opinion
     */
    htmlCheckInputOpinion(event) {
        var input = event.target.value;
        if (typeof input === 'string' && (input.trim().toUpperCase() == 'YES' || input.trim().toUpperCase() == 'NO')) {
            $('#error').hide();
        } else {
            showError("ProposalOpinionKO", 2);
            return false;
        }
    }
    /**
     * if all selected coins are verified, button "Create" will be available
     */
    htmlVerifyCoinSelected() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            var verifytxes = wallet.coinsControlVerifyUTXO().then(function verified(result) {
                alert(result);
                if (result) {
                    if (ui_config.nav_tab == 1) {
                        $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlCreateTransaction()\">Create-Sign</button>");
                        $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                        showError("CreateTxOffline", 0);
                    } else if (ui_config.nav_tab == 2) {
                        $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlCreateInvoicePayment()\">Create-Sign</button>");
                        $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                        showError("CreateTxOffline", 0);
                    } else if (ui_config.nav_tab == 3) {
                        $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlCreateVote()\">Create-Sign</button>");
                        $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                        showError("CreateTxOffline", 0);
                    } else if (ui_config.nav_tab == 10) {
                        $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlCreateMultiSigTransaction()\">Create-Sign</button>");
                        $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                    } else if (ui_config.nav_tab == 12) {
                        $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlCreateProposal()\">Create-Sign</button>");
                        $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                    } else {
                        showError("UnknownNav", 2);
                    }
                } else {
                    $('#txCreate').html("");
                    $('#passphrase').html("");
                }
            });
        }
    }
    /**
     * create the serialized transaction and verify info
     */
    htmlVerifyTxInput() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null || configs.level != 2) {
            showError("WalletNULL", 2);
        } else {
            var multiSigTxInput = JSON.parse($('#rawtxinput').val());
            try {
                var multiSigTx = new bitcore.Transaction(multiSigTxInput);
                var outputs = multiSigTx.outputs;
                var inputs = multiSigTx.inputs;

                var outputString = "";
                var inputString = "";

                for (var i = 0; i < outputs.length; i++) {
                    outputString += "<div>" + outputs[i].script.toAddress().toString() + ": " + bitcore.Unit.fromSatoshis(outputs[i].satoshis).toBTC() + "</div>";
                    outputTotal += outputs[i].satoshis;
                }

                for (var j = 0; j < inputs.length; j++) {
                    inputString += "<div>" + inputs[j].script.toAddress().toString() + ": " + bitcore.Unit.fromSatoshis(inputs[j].output.satoshis).toBTC() + "</div>";
                }

                $('#txFee').html(bitcore.Unit.fromSatoshis(multiSigTx.getFee()).toBTC());
                $('#txInfo').html("<div>From: " + inputString + "<br>To: " + outputString + "</div>");
                if (ui_config.nav_tab == 11) {
                    $('#txCreate').html("<button type=\"button\" onclick=\"ui.htmlSignMultiSigTx()\">Sign</button>");
                    $('#passphrase').html("<b style=\"color:red\">Passphrase:</b> <input id=\"txPassphrase\" type=\"password\" size=\"34\" placeholder=\"Enter your passphrase\"></input>");
                }
                configs.rawtx = multiSigTx;
            } catch (e) {
                alert(e);
                configs.rawtx = null;
                $('#rawtx').html("");
                $('#txInfo').html("");
            }
        }
    }
    /**
     * button create transaction is clicked
     */
    htmlCreateTransaction() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            var destination = $('#txDestination').val();
            var amount = $('#txAmount').val();
            var passphrase = $('#txPassphrase').val();
            $('#rawtx').html("Creating a transaction send to " + destination + " " + amount + " SIN");
            try {
                var tx = wallet.createTransaction(destination, amount, passphrase);
                passphrase = '';
                $('#passphrase').html("");
                $('#txCreate').html("");
                if (!tx) {
                    configs.rawtx = null;
                    $('#commitTx').html("");
                } else {
                    configs.rawtx = tx;
                    $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                    $('#rawtx').html(tx.serialize());
                    $('#commitTx').html("<button type=\"button\" id=\"txSend\" onclick=\"ui.htmlSendTransaction()\">Send</button>");
                }
            } catch (e) {
                alert(e);
                configs.rawtx = null;
                $('#commitTx').html("");
            }
        }
    }
    /**
     * create tx with attached information
     */
    htmlCreateInvoicePayment() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            try {
                var destination = $('#txDestination').val();
                var amount = $('#txAmount').val();
                var invoiceInfo = $('#txInvoiceInfo').val();
                var passphrase = $('#txPassphrase').val();
                $('#rawtx').html("Creating a transaction send to " + destination + " " + amount + " SIN");
                var tx = wallet.createInvoicePayment(destination, amount, invoiceInfo, passphrase);
                passphrase = '';
                $('#passphrase').html("");
                $('#txCreate').html("");
                if (!tx) {
                    configs.rawtx = null;
                    $('#commitTx').html("");
                } else {
                    configs.rawtx = tx;
                    $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                    $('#rawtx').html(tx.serialize());
                    $('#commitTx').html("<button type=\"button\" id=\"txSend\" onclick=\"ui.htmlSendTransaction()\">Send</button>");
                }
            } catch (e) {
                alert(e);
                configs.rawtx = null;
                $('#commitTx').html("");
            }
        }
    }
    /**
     * create Proposal
     * ProposalId = md5sum(tx.hash)
     */
    htmlCreateProposal() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            var fromHeight = parseInt($('#fromHeight').val());
            var toHeight = parseInt($('#toHeight').val());
            var voteFee = parseInt($('#voteFee').val());
            var actionScript = $('#actionProposal').val();
            var passphrase = $('#txPassphrase').val();
            if (this.htmlCheckInputProposal('fromHeight') && this.htmlCheckInputProposal('toHeight') && this.htmlCheckInputProposal('voteFee')) {
                try {
                    var proposalParam = '';
                    if (actionScript.trim() == '') {
                        //scriptUnlock = bitcore.Script.fromASM(actionScript);
                        proposalParam = fromHeight + ";" + toHeight + ";" + voteFee;
                        actionScript = '0';
                    } else {
                        var scriptAction = bitcore.Script.fromASM(actionScript);
                        proposalParam = fromHeight + ";" + toHeight + ";" + voteFee + ";" + scriptAction.toHex();
                    }
                    // 100 characters is limit of SIN network data carrier
                    if (proposalParam.length <= 100) {
                        $('#rawtx').html("Creating a Proposal and send to " + configs.sinGovernanceAddress + " " + configs.proposalAmount + " SIN");
                        var tx = wallet.createProposal(proposalParam, passphrase);
                        passphrase = '';
                        $('#passphrase').html("");
                        $('#txCreate').html("");
                        if (!tx) {
                            configs.rawtx = null;
                            $('#commitTx').html("");
                        } else {
                            configs.rawtx = tx;
                            $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                            $('#rawtx').html(tx.serialize());
                            $('#commitTx').html("<button type=\"button\" id=\"txSend\" onclick=\"ui.htmlSendProposal(" + fromHeight + "," +
                                toHeight + "," +
                                voteFee + "," +
                                actionScript + ")\">Send</button>");
                        }
                    }
                } catch (e) {
                    alert(e);
                    configs.rawtx = null;
                    $('#commitTx').html("");
                }
            } else {
                passphrase = '';
                $('#passphrase').html("");
                $('#txCreate').html("");
                configs.rawtx = null;
                $('#commitTx').html("");
            }
        }
    }
    /**
     * create Vote
     * ProposalId will be changed in next step
     */
    htmlCreateVote() {
        configs.rawtx == null;
        $('#commitTx').html("");
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            var passphrase = $('#txPassphrase').val();
            var opinion = $('#txOpinion').val();
            var nOpinion = 0;
            var proposal = $('#txProposalId').val();
            var nProposalId = parseFloat(proposal);
            try {
                if (opinion.trim().trim().toUpperCase() == 'YES') {
                    nOpinion = 1;
                } else if (opinion.trim().trim().toUpperCase() == 'NO') {
                    nOpinion = 0;
                } else {
                    showError("ProposalOpinionKO", 2);
                    return false;
                }

                if (10000000 > nProposalId || nProposalId > 99999999) {
                    showError("ProposalFormatKO", 2);
                    return false;
                }

                $('#rawtx').html("Creating a vote and send to " + configs.sinBurnAddress + " " + configs.voteAmount + " SIN");
                var tx = wallet.createVote(nProposalId, nOpinion, passphrase);
                passphrase = '';
                $('#passphrase').html("");
                $('#txCreate').html("");
                if (!tx) {
                    configs.rawtx = null;
                    $('#commitTx').html("");
                } else {
                    configs.rawtx = tx;
                    $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                    $('#rawtx').html(tx.serialize());
                    $('#commitTx').html("<button type=\"button\" id=\"txSend\" onclick=\"ui.htmlSendTransaction()\">Send</button>");
                }
            } catch (e) {
                alert(e);
                configs.rawtx = null;
                $('#commitTx').html("");
            }
        }
    }
    /**
     * Create multisig address from inputs public keys
     */
    htmlVerifyAndCreateMultiSigP2SHAdress() {
        var publicKeys = $('#multiSigPublicKeys').val().replace(" ", "").replace(/\n|\r/g, '').trim().split(',');
        var threshold = parseInt($('#requiredSignatures').val());
        try {
            var KeysArray = [];
            for (var i = 0; i < publicKeys.length; i++) {
                var pubkey = new bitcore.PublicKey(publicKeys[i]);
                KeysArray.push(pubkey);
            }

            if (KeysArray.length != publicKeys.length) {
                showError("CreateMultiSigReadKeysKO", 1);
                $('#commitTx').html("");
            } else {
                if (threshold <= KeysArray.length) {
                    var script = new bitcore.Script.buildMultisigOut(KeysArray, threshold);
                    var address = new bitcore.Address.createMultisig(KeysArray, threshold);
                    $('#commitTx').html("MultiSig Address " + threshold + "-" + KeysArray.length + ": " + address.toString());
                    $('#error').hide();
                } else {
                    showError("CreateMultiSigAddressKO", 2);
                }
            }
        } catch (e) {
            alert(e);
            showError("CreateMultiSigAddressKO", 2);
            $('#commitTx').html("");
        }
    }
    /**
     * create MultiSig Transaction without signature
     */
    htmlCreateMultiSigTransaction() {
        configs.rawtx == null;
        $('#rawtx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            var destination = $('#txDestination').val();
            var amount = $('#txAmount').val();
            var publicKeys = $('#multiSigPublicKeys').val().replace(" ", "").replace(/\n|\r/g, '').trim().split(',');
            var threshold = parseInt($('#requiredSignatures').val());
            var passphrase = $('#txPassphrase').val();

            try {
                var KeysArray = [];
                for (var i = 0; i < publicKeys.length; i++) {
                    var pubkey = new bitcore.PublicKey(publicKeys[i]);
                    KeysArray.push(pubkey);
                }

                if (KeysArray.length != publicKeys.length) {
                    if (KeysArray.length != publicKeys.length) {
                        showError("CreateMultiSigReadKeysKO", 1);
                        $('#commitTx').html("");
                    }
                } else {
                    if (threshold <= KeysArray.length) {
                        $('#rawtx').html("Creating a transaction send to " + destination + " " + amount + " SIN");
                        var tx = wallet.createMultiSigTransaction(destination, amount, KeysArray, threshold);
                        $('#txCreate').html("");
                        if (!tx) {
                            configs.rawtx = null;
                        } else {
                            configs.rawtx = tx;
                            $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                            $('#rawtx').html(JSON.stringify(tx.toJSON()));
                        }
                    } else {
                        showError("CreateMultiSigAddressKO", 2);
                    }
                }
            } catch (e) {
                alert(e);
                showError("CreateMultiSigAddressKO", 2);
                $('#commitTx').html("");
            }
        }
    }
    /**
     * sign multisig transaction
     */
    htmlSignMultiSigTx() {
        if (configs.level = 2) {
            var passphrase = $('#txPassphrase').val();
            try {
                var tx = wallet.signMultiSigTx(configs.rawtx, passphrase);
                passphrase = '';
                $('#passphrase').html("");
                if (!tx) {
                    configs.rawtx = null;
                    $('#commitTx').html("");
                } else {
                    configs.rawtx = tx;
                    $('#txFee').html(bitcore.Unit.fromSatoshis(tx.getFee()).toBTC());
                    if (tx.isFullySigned()) {
                        $('#rawtx').html(tx.serialize());
                        $('#commitTx').html("<button type=\"button\" id=\"txSend\" onclick=\"ui.htmlSendTransaction()\">Send</button>");
                    } else {
                        $('#rawtx').html(JSON.stringify(tx.toJSON()));
                        showError("SignMultiSigRequire", 1);
                    }
                }
            } catch (e) {
                alert(e);
            }
        } else {
            showError("SignTxWithLevelKO", 1);
        }
    }
    /**
     * button send transaction is clicked
     */
    htmlSendTransaction() {
        $('#commitTx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            if (configs.rawtx == null) {
                showError("SendTxNull", 1);
            } else {
                (async () => {
                    var txhash = await backend.api('sendtx', {
                        'address': configs.rawtx.toString()
                    });
                    if (typeof txhash.result === 'undefined' || typeof txhash.error === 'string') {
                        configs.rawtx = null;
                        $('#rawtx').html("ERROR: cannot send tx! " + txhash.error);
                    } else {
                        $('#rawtx').html(txhash.result);
                        showError("SendTxCommited", 0);
                    }
                })();
            }
        }
    }
    /**
     * button send proposal is clicked
     */
    htmlSendProposal(fromHeight, toHeight, voteFee, actionScript) {
        $('#commitTx').html("");
        if (wallet == null) {
            showError("WalletNULL", 2);
        } else {
            if (configs.rawtx == null) {
                showError("SendTxNull", 1);
            } else {
                (async () => {
                    var data = {
                        'hash': configs.rawtx.hash,
                        'tx': configs.rawtx.toString(),
                        'begin': fromHeight,
                        'end': toHeight,
                        'voteFee': voteFee,
                        'action': actionScript
                    };
                    var txhash = await backend.api('sendproposal', data);
                    var result = JSON.parse(txhash);
                    if (typeof result.result === 'undefined') {
                        configs.rawtx = null;
                        $('#rawtx').html("ERROR: cannot send tx! ");
                    } else {
                        $('#rawtx').html(txhash.result);
                        showError("SendTxCommited", 0);
                    }
                })();
            }
        }
    }
    /**
     * send Coin from Alice to Bob
     */
    htmlUISendCoin() {
        $('#SendcoinTx').html("");
        ui_config.nav_tab = 1;
        $('#SendcoinTx').html(
            "<h3>Send Coin</h3>" +
            "<div id=\"sendcoin\">" +
            "<p><form style=\"heigh:50px\">" +
            "<div class=\"multiselect\">" +
            "<div class=\"selectBox\" onclick=\"ui.htmlUpdateCoinControl()\">" +
            "<select>" +
            "<option>Coin control</option>" +
            "</select>" +
            "<div class=\"overSelect\"></div>" +
            "</div>" +
            "<div id=\"coincontrol\"></div>" +
            "</div>" +
            "</form></p>" +
            "<p>Coin selected: <b id=\"coincontrol_selected\">0</b> SIN" +
            "<p>Destination: <input id=\"txDestination\" type=\"text\" size=\"34\" placeholder=\"SIN address format\" accept=\"text/plain\" onchange=\"ui.htmlCheckInputAddress(event);\"/></p>" +
            "<p>Amount: <input id=\"txAmount\" type=\"number\" size=\"15\" placeholder=\"Example: 0.5\"/><button type=\"button\" id=\"txAutoselect\" onclick=\"ui.htmlUpdateCoinControlFromAmount(event)\">Auto select coins</button></p>" +
            "<p>Fee: <b id=\"txFee\"></b></p>" +
            "<p id=\"passphrase\"></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyCoinSelected()\">Verify input</button></p>" +
            "<p id=\"txCreate\"></p>" +
            "<p>Transaction: <br><textarea rows=\"5\" cols=\"80\" id=\"rawtx\"></textarea></p>" +
            "<p id=\"commitTx\"></p>" +
            "</div>"
        );
    }
    /**
     * send invoice payment
     */
    htmlUISendInvoicePayment() {
        $('#InvoicePayment').html("");
        ui_config.nav_tab = 2;
        $('#InvoicePayment').html(
            "<h3>Payment</h3>" +
            "<div id=\"invoicepayment\">" +
            "<p><form style=\"heigh:50px\">" +
            "<div class=\"multiselect\">" +
            "<div class=\"selectBox\" onclick=\"ui.htmlUpdateCoinControl()\">" +
            "<select>" +
            "<option>Coin control</option>" +
            "</select>" +
            "<div class=\"overSelect\"></div>" +
            "</div>" +
            "<div id=\"coincontrol\"></div>" +
            "</div>" +
            "</form></p>" +
            "<p>Coin selected: <b id=\"coincontrol_selected\">0</b> SIN" +
            "<p>Merchant: <input id=\"txDestination\" type=\"text\" size=\"34\" placeholder=\"SIN address format\" accept=\"text/plain\" onchange=\"ui.htmlCheckInputAddress(event);\"/></p>" +
            "<p>Invoice: <input id=\"txInvoiceInfo\" type=\"text\" size=\"34\" placeholder=\"ClientId;Invoice's number\" accept=\"text/plain\" onchange=\"ui.htmlCheckInputInvoiceInfo(event);\"/></p>" +
            "<p>Amount: <input id=\"txAmount\" type=\"number\" size=\"15\" placeholder=\"Example: 0.5\"/><button type=\"button\" id=\"txAutoselect\" onclick=\"ui.htmlUpdateCoinControlFromAmount(event)\">Auto select coins</button></p>" +
            "<p>Fee: <b id=\"txFee\"></b></p>" +
            "<p id=\"passphrase\"></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyCoinSelected()\">Verify input</button></p>" +
            "<p id=\"txCreate\"></p>" +
            "<p>Transaction: <br><textarea rows=\"5\" cols=\"80\" id=\"rawtx\"></textarea></p>" +
            "<p id=\"commitTx\"></p>" +
            "</div>"
        );
    }
    /**
     * send Vote for SIP
     */
    htmlUIVote() {
        $('#VoteTx').html("");
        ui_config.nav_tab = 3;
        $('#VoteTx').html(
            "<h3>R.S.V Vote</h3>" +
            "<div id=\"vote\">" +
            "<p><form style=\"heigh:50px\">" +
            "<div class=\"multiselect\">" +
            "<div class=\"selectBox\" onclick=\"ui.htmlUpdateCoinControl()\">" +
            "<select>" +
            "<option>Coin control</option>" +
            "</select>" +
            "<div class=\"overSelect\"></div>" +
            "</div>" +
            "<div id=\"coincontrol\"></div>" +
            "</div>" +
            "</form></p>" +
            "<p>Coin selected: <b id=\"coincontrol_selected\">0</b> SIN / Vote value: <b style=\"color:green;\">" + configs.voteAmount + "</b> SIN</p>" +
            "<p>ProposalId: <input id=\"txProposalId\" type=\"number\" size=\"10\" placeholder=\"SIN Proposal Id\" onchange=\"ui.htmlCheckInputProposalFormat(event);\"/></p>" +
            "<p>Opinion: <input id=\"txOpinion\" type=\"text\" size=\"5\" placeholder=\"Yes or No\" accept=\"text/plain\" onchange=\"ui.htmlCheckInputOpinion(event);\"/></p>" +
            "<p>Fee: <b id=\"txFee\"></b></p>" +
            "<p id=\"passphrase\"></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyCoinSelected()\">Verify input</button></p>" +
            "<p id=\"txCreate\"></p>" +
            "<p>Transaction: <br><textarea rows=\"5\" cols=\"80\"  id=\"rawtx\"></textarea></p>" +
            "<p id=\"commitTx\"></p>" +
            "</div>"
        );
        this.htmlUpdateCoinControlFromAmount(configs.voteAmount);
    }
    /**
     * create multisig address
     */
    htmlUICreateMultiSigAddress() {
        $('#MultiSig').html("");
        ui_config.nav_tab = 9;
        $('#MultiSig').html(
            "<h3>Multisignature Address</h3>" +
            "<p>Multisignature (multisig) refers to requiring multiple keys to authorize a <br>" +
            "Sinovate transaction, rather than a single signature from one key.<br>" +
            "Please use: <i>sin-cli getaddressinfo YourAddress</i><br>" +
            "to get information about <u>your publicKey</u>." +
            "<hr>" +
            "<p>List of Public Keys: <br><textarea id=\"multiSigPublicKeys\" name=\"multiSigPublicKey\" placeholder=\"02fc1534fb3c2312afae74fea33a5a1322491025dc774bcfd72ba4f2518f66742c, 0380f8d4ef595c8c20a97fa8764db1d1d0d736d3cf1d00fad64ba53d89494227d0, 031486505d64aa7d276c190382494370892178e3e855b5bbacc82f0e852cf4c82f\" rows=\"5\" cols=\"80\"></textarea><p>" +
            "<p>Required Signatures: <input id=\"requiredSignatures\" type=\"number\" size=\"2\" placeholder=\"2\"></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyAndCreateMultiSigP2SHAdress()\">Verify input</button></p>" +
            "<p id=\"commitTx\"></p>" +
            "</p>"
        );
    }
    /**
     * create multisig transaction
     */
    htmlUICreateMultiSigTx() {
        $('#MultiSigTx').html("");
        ui_config.nav_tab = 10;
        $('#MultiSigTx').html(
            "<div><h3>Multisign tx</h3></div>" +
            "<div id=\"sendcoin\">" +
            "<p><form style=\"heigh:50px\">" +
            "<div class=\"multiselect\">" +
            "<div class=\"selectBox\" onclick=\"ui.htmlUpdateCoinControl()\">" +
            "<select>" +
            "<option>Coin control</option>" +
            "</select>" +
            "<div class=\"overSelect\"></div>" +
            "</div>" +
            "<div id=\"coincontrol\"></div>" +
            "</div>" +
            "</form></p>" +
            "<p>Coin selected: <b id=\"coincontrol_selected\">0</b> SIN" +
            "<p>List of Public Keys: <br><textarea id=\"multiSigPublicKeys\" name=\"multiSigPublicKey\" placeholder=\"02fc1534fb3c2312afae74fea33a5a1322491025dc774bcfd72ba4f2518f66742c, 0380f8d4ef595c8c20a97fa8764db1d1d0d736d3cf1d00fad64ba53d89494227d0, 031486505d64aa7d276c190382494370892178e3e855b5bbacc82f0e852cf4c82f\" rows=\"5\" cols=\"80\"></textarea><p>" +
            "<p>Required Signatures: <input id=\"requiredSignatures\" type=\"number\" size=\"2\" placeholder=\"2\"></p>" +
            "<p>Destination: <input id=\"txDestination\" type=\"text\" size=\"34\" placeholder=\"SIN address format\" accept=\"text/plain\" onchange=\"ui.htmlCheckInputAddress(event);\"/></p>" +
            "<p>Amount: <input id=\"txAmount\" type=\"number\" size=\"15\" placeholder=\"Example: 0.5\"/><button type=\"button\" id=\"txAutoselect\" onclick=\"ui.htmlUpdateCoinControlFromAmount(event)\">Auto select coins</button></p>" +
            "<p>Fee: <b id=\"txFee\"></b></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyCoinSelected()\">Verify input</button></p>" +
            "<p id=\"txCreate\"></p>" +
            "<p>Transaction: <br><textarea rows=\"5\" cols=\"80\" id=\"rawtx\"></textarea></p>" +
            "</div>"
        );
    }
    /**
     * sign transaction
     */
    htmlUISignTransaction() {
        $('#SignTx').html("");
        ui_config.nav_tab = 11;
        if (configs.level == 2) {
            $('#SignTx').html(
                "<div><h3>Multisign tx</h3></div>" +
                "<p>Input(JSON format): <br><textarea rows=\"5\" cols=\"80\" id=\"rawtxinput\"></textarea></p>" +
                "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyTxInput()\">Verify input</button></p>" +
                "<p>Transaction: <div id=\"txInfo\"></div></p>" +
                "<p>Fee: <b id=\"txFee\"></b></p>" +
                "<p id=\"passphrase\"></p>" +
                "<p id=\"txCreate\"></p>" +
                "<p>Signed Transaction: <br><textarea rows=\"5\" cols=\"80\" id=\"rawtx\"></textarea></p>" +
                "<p id=\"commitTx\"></p>"
            );
        } else {
            $('#SignTx').html(
                "<div><h3>Multisign tx</h3></div>" +
                "<p>Wallet need to be opened with Keyfile (level 2) if you want to sign a transaction.</p>"
            );
            showError("SignTxWithLevelKO", 1);
        }
    }
    /**
     * create proposal
     */
    htmlUICreateProposal() {
        $('#Proposal').html("");
        ui_config.nav_tab = 12;
        $('#Proposal').html(
            "<div><h3>Proposal</h3></div>" +
            "<div id=\"vote\">" +
            "<p><form style=\"heigh:50px\" action=\"\">" +
            "<div class=\"multiselect\">" +
            "<div class=\"selectBox\" onclick=\"ui.htmlUpdateCoinControl()\">" +
            "<select>" +
            "<option>Coin control</option>" +
            "</select>" +
            "<div class=\"overSelect\"></div>" +
            "</div>" +
            "<div id=\"coincontrol\"></div>" +
            "</div>" +
            "</form></p>" +
            "<p>Coin selected: <b id=\"coincontrol_selected\">0</b> SIN</p>" +
            "<p>From height: <input id=\"fromHeight\" type=\"number\" placeholder=\"300000\" style=\"width:70px;\"  onchange=\"ui.htmlCheckInputProposal('fromHeight');\"/> To height: <input id=\"toHeight\" type=\"number\" placeholder=\"300100\" style=\"width:70px;\" onchange=\"ui.htmlCheckInputProposal('toHeight');\"/></p>" +
            "<p>Vote Fee limit: <input id=\"voteFee\" type=\"number\" placeholder=\"1\" style=\"width:40px;\" onchange=\"ui.htmlCheckInputProposal('voteFee');\"/></p>" +
            "<p>Action(optional): <br><textarea rows=\"1\" cols=\"80\"  id=\"actionProposal\"></textarea></p>" +
            "<p id=\"passphrase\"></p>" +
            "<p id=\"txVerify\"><button type=\"button\" onclick=\"ui.htmlVerifyCoinSelected()\">Verify input</button></p>" +
            "<p id=\"txCreate\"></p>" +
            "<p>Transaction: <br><textarea rows=\"5\" cols=\"80\"  id=\"rawtx\"></textarea></p>" +
            "<p id=\"commitTx\"></p>" +
            "</div>"
        );
        this.htmlUpdateCoinControlFromAmount(configs.proposalAmount);
    }
    /**
     * BurnFund to create node
     */
    htmlUIBurnFundNode() {
        $('#BurnFundNodeTx').html("");
        ui_config.nav_tab = 4;
        $('#BurnFundNodeTx').html("<h3>Keyfile </h3><br><p>To use this tool, please use SIN wallet and export a Keyfile with RPC <br>exportaddressnewpass youraddress newpassphrase</p>");
    }
    /**
     * Update Metadata of node
     */
    htmlUIUpdateMeatdataNode() {
        $('#UpdateMetadataTx').html("");
        ui_config.nav_tab = 5;
        $('#UpdateMetadataTx').html("coming soon...");
    }
    htmlUIChangeRewardAddress() {
        $('#ChangeRewardAddress').html("");
        ui_config.nav_tab = 6;
        $('#ChangeRewardAddress').html("coming soon...");
    }
    htmlUISendData() {
        $('#SendData').html("");
        ui_config.nav_tab = 7;
        $('#SendData').html("coming soon...");
    }
    htmlUIHistorical() {
        $('#Historical').html("");
        ui_config.nav_tab = 8;
        $('#Historical').html("coming soon...");
    }
    /**
     * UI Control
     */
    htmlOpenTab(evt, itemName) {
        // Declare all variables
        var i, tabcontent, tablinks;
        //Get all elements with class="tabcontent" and remove the content
        if (wallet != null) {
            $(".tabcontent").empty();
            wallet.unselectedCoin();
            $('#error').hide();
        }
        // Get all elements with class="tabcontent" and hide them
        tabcontent = $(".tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = $(".tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(itemName).style.display = "block";
        evt.currentTarget.className += " active";
        if (itemName == "SendcoinTx" && wallet != null) {
            this.htmlUISendCoin();
        }
        if (itemName == "InvoicePayment" && wallet != null) {
            this.htmlUISendInvoicePayment();
        }
        if (itemName == "VoteTx" && wallet != null) {
            this.htmlUIVote();
        }
        if (itemName == "MultiSig" && wallet != null) {
            this.htmlUICreateMultiSigAddress();
        }
        if (itemName == "MultiSigTx" && wallet != null) {
            this.htmlUICreateMultiSigTx();
        }
        if (itemName == "SignTx" && wallet != null) {
            this.htmlUISignTransaction();
        }
        if (itemName == "Proposal" && wallet != null) {
            this.htmlUICreateProposal();
        }
        if (itemName == "BurnFundNodeTx" && wallet != null) {
            this.htmlUIBurnFundNode();
        }
        if (itemName == "UpdateMetadataTx" && wallet != null) {
            this.htmlUIUpdateMeatdataNode();
        }
        if (itemName == "ChangeRewardAddress" && wallet != null) {
            this.htmlUIChangeRewardAddress();
        }
        if (itemName == "SendData" && wallet != null) {
            this.htmlUISendData();
        }
        if (itemName == "Historical" && wallet != null) {
            this.htmlUIHistorical();
        }
    }
}
//Declaration of global variable UI
ui = new UI();

class WebWallet {
    constructor(options) {
        if (typeof options === 'string') {
            options = {
                otp: options
            };
        }
        this.config = Object.assign(defaults, configs, options);
        this.coinscontrol = [];
        this.coinscontrol_selected = [];
        this.coinscontrol_selected_detail = [];
        this.balance = 0;
        (async () => {
            try {
                this.coinscontrol = await backend.api('utxo', {
                    'address': this.config.address
                });
                if (typeof this.coinscontrol === 'undifined') {
                    showError("WalletBalanceKO", 2);
                } else {
                    this.balance = this.calculBalance(this.coinscontrol);
                    ui.htmlUpdate('balance', this.balance);
                }
            } catch (e) {
                showError("WalletBalanceKO", 2);
            }
        })();
    }
    init() {
        this.coinscontrol = [];
        this.coinscontrol_selected = [];
        this.coinscontrol_selected_detail = [];
        this.balance = 0;
        (async () => {
            this.coinscontrol = await backend.api('utxo', {
                'address': this.config.address
            });
            if (typeof this.coinscontrol === 'undifined') {
                showError("WalletBalanceKO");
            } else {
                this.balance = this.calculBalance(this.coinscontrol);
                ui.htmlUpdate('balance', this.balance);
            }
        })();
    }
    /**
     * calcul total of balance
     * @param: 
     */
    calculBalance(coins) {
        let total = BigNumber(0);
        if (coins.length == 0) return 0;
        for (var i = 0; i < coins.length; i++) {
            total = total.plus(BigNumber(coins[i].amount));
        }
        return total.toString();
    }
    /**
     * getBalance
     * @param: 
     */
    getBalance() {
        return this.balance;
    }
    /**
     * getCoins
     */
    getCoins() {
        return this.coinscontrol;
    }
    getCoinsControlSelected() {
        return this.coinscontrol_selected;
    }
    /**
     * coins selected from UI
     * @param: {String} txid
     */
    coinsControlSelected(txid) {
        var txinfo = txid.split("-");
        var txexist = false;
        var tx = null;
        if (typeof txinfo === 'undefined' || txinfo.length != 2 || txinfo[0].length != 64) {
            return false;
        }
        for (var i = 0; i < this.coinscontrol.length; i++) {
            if (this.coinscontrol[i].txid == txinfo[0] && this.coinscontrol[i].vout == txinfo[1]) {
                txexist = true;
                tx = this.coinscontrol[i];
            }
        }

        if (txexist) {
            var index = this.coinscontrol.indexOf(tx);
            var indexSelected = this.coinscontrol_selected.indexOf(tx);
            if (indexSelected == -1) {
                this.coinscontrol_selected.push(tx);
            } else {
                this.coinscontrol_selected.splice(indexSelected, 1);
            }
        } else {
            showError("WalletNULL", 2);
        }
    }
    /**
     * remove selected coins
     */
    unselectedCoin() {
        this.coinscontrol_selected = [];
    }

    /**
     * Automatic select coins for amount. All control of amount was done in previous step.
     * we are sure that amount    is between 0 and balance of wallet. 
     * @param: {Number} amount
     */
    coinsControlSelectForAmount(amount) {
        this.coinscontrol_selected = [];
        if (amount == 0 || amount == null || amount > this.balance) {
            return false;
        } else {
            for (var i = 0; i < this.coinscontrol.length; i++) {
                var tx = this.coinscontrol[i];
                this.coinscontrol_selected.push(tx);
                if (this.calculBalance(this.coinscontrol_selected) >= amount) {
                    break;
                }
            }
            return true;
        }
    }
    /**
     * get information about Transactions in selected list of coin control
     */
    async coinsControlVerifyUTXO() {
        if (this.coinscontrol_selected.length == 0) {
            showError("CoinControlNULL", 1);
            return false;
        } else {
            showError("CoinControlVerifying", 0);
            this.coinscontrol_selected_detail = [];
            var verified = 0;
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                try {
                    var tx = await backend.api('tx', {
                        'address': this.coinscontrol_selected[i].txid
                    });
                    if (typeof tx === 'undefined' || tx.vout.length > 0) {
                        for (var j = 0; j < tx.vout.length; j++) {
                            if (tx.vout[j].n == this.coinscontrol_selected[i].vout) {
                                var txinfo = {
                                    txid: this.coinscontrol_selected[i].txid,
                                    vout: tx.vout[j].n,
                                    address: tx.vout[j].scriptPubKey.addresses[0],
                                    script: tx.vout[j].scriptPubKey.hex
                                }
                                this.coinscontrol_selected_detail.push(txinfo);
                                verified++;
                            }
                        }
                    }
                } catch (e) {
                    showError("CoinControlVerifyKO", 2);
                    return false;
                }
            }
            if (verified == this.coinscontrol_selected.length) {
                showError("CoinControlVerifyOK", 0);
                return true;
            } else {
                showError("CoinControlVerifyKO", 2);
                return false;
            }
        }
    }
    /**
     * create a transaction
     * @param {String} destination
     * @param {Number} amount
     * @param {String} passphrase
     * @return {Transaction/boolean}
     */
    createTransaction(destination, amount, passphrase) {
        var nAmount = parseFloat(amount);
        if (nAmount > this.balance) {
            showError("WalletAmountTooBig", 2);
            return false;
        }
        if (nAmount <= 0.01) {
            showError("WalletAmountTooSmall", 2);
            return false;
        }
        if (!bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
            !bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
            showError("ImportAddressError", 2);
            return false;
        }
        if (this.coinscontrol_selected.length != this.coinscontrol_selected_detail.length) {
            showError("WalletNULL", 2);
            return false;
        }
        if (nAmount > this.calculBalance(this.coinscontrol_selected)) {
            showError("CoinControlSelectCoin", 2);
            return false;
        }
        if (this.config.level == 1) {
            showError("CreateTxKOLevel1", 2);
            return false;
        }

        var utxos = [];
        if (this.coinscontrol_selected.length > 0) {
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                for (var j = 0; j < this.coinscontrol_selected_detail.length; j++) {
                    if (this.coinscontrol_selected[i].txid == this.coinscontrol_selected_detail[j].txid &&
                        this.coinscontrol_selected[i].vout == this.coinscontrol_selected_detail[j].vout) {
                        var utxo = {
                            "txId": this.coinscontrol_selected[i].txid,
                            "outputIndex": this.coinscontrol_selected[i].vout,
                            "satoshis": this.coinscontrol_selected[i].satoshis,
                            "address": this.coinscontrol_selected_detail[j].address,
                            "script": this.coinscontrol_selected_detail[j].script
                        }
                        utxos.push(utxo);
                    }
                }
            }
        }

        var Unit = bitcore.Unit;
        var value = Unit.fromBTC(nAmount).toSatoshis();
        try {
            //SIN fee change 100000 -> 10000000
            var transaction = new bitcore.Transaction()
                .from(utxos)
                .to(destination, value)
                .feePerKb(10000000)
                .change(this.config.address.toString())
                .sign(bitcore.PrivateKey.fromEncrypted(this.config.cipherTxt, this.config.vSalt, this.config.rounds, passphrase));
            return transaction;
        } catch (e) {
            alert("Transaction: " + e);
            passphrase = '';
            $('#passphrase').html("");
            $('#txCreate').html("");
            return false;
        }
    }
    /**
     * create invoice payment
     * @param {String} destination
     * @param {Number} amount
     * @param {String} invoiceInfo
     * @param {String} passphrase
     * @return {Transaction/boolean}
     */
    createInvoicePayment(destination, amount, invoiceInfo, passphrase) {
        var nAmount = parseFloat(amount);
        if (nAmount > this.balance) {
            showError("WalletAmountTooBig", 2);
            return false;
        }
        if (nAmount <= 0.01) {
            showError("WalletAmountTooSmall", 2);
            return false;
        }
        if (!bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
            !bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
            showError("ImportAddressError", 2);
            return false;
        }
        if (this.coinscontrol_selected.length != this.coinscontrol_selected_detail.length) {
            showError("WalletNULL", 2);
            return false;
        }
        if (nAmount > this.calculBalance(this.coinscontrol_selected)) {
            showError("CoinControlSelectCoin", 2);
            return false;
        }
        if (this.config.level == 1) {
            showError("CreateTxKOLevel1", 2);
            return false;
        }

        if (invoiceInfo.length == 0) {
            showError("InvoiceInfoFormatNull", 2);
            return false;
        }
        if (invoiceInfo.length > 80) {
            showError("InvoiceInfoFormatKO", 2);
            return false;
        }
        var regex = /^[a-zA-Z0-9;!@#\$%\^\&*\)\(+=._-]+$/g;
        if (!regex.test(invoiceInfo)) {
            showError("InvoiceInfoFormatKO", 2);
            return false;
        }

        var utxos = [];
        if (this.coinscontrol_selected.length > 0) {
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                for (var j = 0; j < this.coinscontrol_selected_detail.length; j++) {
                    if (this.coinscontrol_selected[i].txid == this.coinscontrol_selected_detail[j].txid &&
                        this.coinscontrol_selected[i].vout == this.coinscontrol_selected_detail[j].vout) {
                        var utxo = {
                            "txId": this.coinscontrol_selected[i].txid,
                            "outputIndex": this.coinscontrol_selected[i].vout,
                            "satoshis": this.coinscontrol_selected[i].satoshis,
                            "address": this.coinscontrol_selected_detail[j].address,
                            "script": this.coinscontrol_selected_detail[j].script
                        }
                        utxos.push(utxo);
                    }
                }
            }
        }

        var Unit = bitcore.Unit;
        var value = Unit.fromBTC(nAmount).toSatoshis();
        try {
            //SIN fee change 100000 -> 20000000: double fee to make sure tx will be send
            //fee 10000000 = 0.1 SIN => avoid dust amount
            var transaction = new bitcore.Transaction()
                .from(utxos)
                .to(destination, value)
                .addBurnData(destination, invoiceInfo, 0)
                .feePerKb(20000000)
                .change(this.config.address.toString())
                .sign(bitcore.PrivateKey.fromEncrypted(this.config.cipherTxt, this.config.vSalt, this.config.rounds, passphrase));
            return transaction;
        } catch (e) {
            alert("Transaction: " + e);
            passphrase = '';
            $('#passphrase').html("");
            $('#txCreate').html("");
            return false;
        }
    }
    /**
     * create proposal
     */
    createProposal(proposalParam, passphrase) {
        if (typeof proposalParam != 'string' || proposalParam.length > 100) return false;
        var utxos = [];
        if (this.coinscontrol_selected.length > 0) {
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                for (var j = 0; j < this.coinscontrol_selected_detail.length; j++) {
                    if (this.coinscontrol_selected[i].txid == this.coinscontrol_selected_detail[j].txid &&
                        this.coinscontrol_selected[i].vout == this.coinscontrol_selected_detail[j].vout) {
                        var utxo = {
                            "txId": this.coinscontrol_selected[i].txid,
                            "outputIndex": this.coinscontrol_selected[i].vout,
                            "satoshis": this.coinscontrol_selected[i].satoshis,
                            "address": this.coinscontrol_selected_detail[j].address,
                            "script": this.coinscontrol_selected_detail[j].script
                        }
                        utxos.push(utxo);
                    }
                }
            }
        }

        var Unit = bitcore.Unit;
        var value = Unit.fromBTC(configs.proposalAmount).toSatoshis();

        try {
            //SIN fee change 100000 -> 20000000: double fee to make sure tx will be send
            var transaction = new bitcore.Transaction()
                .from(utxos)
                .addBurnData(configs.sinGovernanceAddress, proposalParam, value)
                .feePerKb(20000000)
                .change(this.config.address.toString())
                .sign(bitcore.PrivateKey.fromEncrypted(this.config.cipherTxt, this.config.vSalt, this.config.rounds, passphrase));
            return transaction;
        } catch (e) {
            var custom_message = "";
            if (e == "Error: Input string too short") custom_message = "(Look like passphrase is incorrect!)";
            alert("Transaction: " + e + " " + custom_message);
            passphrase = '';
            $('#passphrase').html("");
            $('#txCreate').html("");
            return false;
        }
    }
    /**
     * create vote
     * @param {String} nProposalId
     * @param {String} nOpinion [yes, no]
     * @param {String} passphrase
     * @return {Transaction/boolean}
     */
    createVote(nProposalId, nOpinion, passphrase) {
        if (this.coinscontrol_selected.length != this.coinscontrol_selected_detail.length) {
            showError("WalletNULL", 2);
            return false;
        }
        if (configs.voteAmount > this.calculBalance(this.coinscontrol_selected)) {
            showError("CoinControlSelectCoin", 2);
            return false;
        }
        if (this.config.level == 1) {
            showError("CreateTxKOLevel1", 2);
            return false;
        }

        var utxos = [];
        if (this.coinscontrol_selected.length > 0) {
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                for (var j = 0; j < this.coinscontrol_selected_detail.length; j++) {
                    if (this.coinscontrol_selected[i].txid == this.coinscontrol_selected_detail[j].txid &&
                        this.coinscontrol_selected[i].vout == this.coinscontrol_selected_detail[j].vout) {
                        var utxo = {
                            "txId": this.coinscontrol_selected[i].txid,
                            "outputIndex": this.coinscontrol_selected[i].vout,
                            "satoshis": this.coinscontrol_selected[i].satoshis,
                            "address": this.coinscontrol_selected_detail[j].address,
                            "script": this.coinscontrol_selected_detail[j].script
                        }
                        utxos.push(utxo);
                    }
                }
            }
        }

        var Unit = bitcore.Unit;
        var value = Unit.fromBTC(configs.voteAmount).toSatoshis();

        try {
            //SIN fee change 100000 -> 20000000: double fee to make sure tx will be send
            var transaction = new bitcore.Transaction()
                .from(utxos)
                .addBurnData(configs.sinGovernanceAddress, nProposalId + "" + nOpinion, value)
                .feePerKb(20000000)
                .change(this.config.address.toString())
                .sign(bitcore.PrivateKey.fromEncrypted(this.config.cipherTxt, this.config.vSalt, this.config.rounds, passphrase));
            return transaction;
        } catch (e) {
            alert(e)
            passphrase = '';
            $('#passphrase').html("");
            $('#txCreate').html("");
            return false;
        }
    }
    /**
     * create multisig tx without signature
     */
    createMultiSigTransaction(destination, amount, KeysArray, threshold) {
        var nAmount = parseFloat(amount);
        if (nAmount > this.balance) {
            showError("WalletAmountTooBig", 2);
            return false;
        }
        if (nAmount <= 0.01) {
            showError("WalletAmountTooSmall", 2);
            return false;
        }
        if (!bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
            !bitcore.Address.isValid(destination, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
            showError("ImportAddressError", 2);
            return false;
        }
        if (this.coinscontrol_selected.length != this.coinscontrol_selected_detail.length) {
            showError("WalletNULL", 2);
            return false;
        }
        if (nAmount > this.calculBalance(this.coinscontrol_selected)) {
            showError("CoinControlSelectCoin", 2);
            return false;
        }

        var utxos = [];
        if (this.coinscontrol_selected.length > 0) {
            for (var i = 0; i < this.coinscontrol_selected.length; i++) {
                for (var j = 0; j < this.coinscontrol_selected_detail.length; j++) {
                    if (this.coinscontrol_selected[i].txid == this.coinscontrol_selected_detail[j].txid &&
                        this.coinscontrol_selected[i].vout == this.coinscontrol_selected_detail[j].vout) {
                        var utxo = {
                            "txId": this.coinscontrol_selected[i].txid,
                            "outputIndex": this.coinscontrol_selected[i].vout,
                            "satoshis": this.coinscontrol_selected[i].satoshis,
                            "address": this.coinscontrol_selected_detail[j].address,
                            "script": this.coinscontrol_selected_detail[j].script
                        }
                        utxos.push(utxo);
                    }
                }
            }
        }

        var Unit = bitcore.Unit;
        var value = Unit.fromBTC(nAmount).toSatoshis();
        try {
            //SIN fee change 100000 -> 10000000
            var transaction = new bitcore.Transaction()
                .from(utxos, KeysArray, threshold)
                .to(destination, value)
                .feePerKb(10000000)
                .change(this.config.address.toString());
            return transaction;
        } catch (e) {
            alert(e);
            $('#passphrase').html("");
            $('#txCreate').html("");
            return false;
        }
    }
    /**
     * sign multisigTx
     */
    signMultiSigTx(transaction, passphrase) {
        var tx = transaction.sign(bitcore.PrivateKey.fromEncrypted(this.config.cipherTxt, this.config.vSalt, this.config.rounds, passphrase));
        return tx;
    }
}

/**
 * Check input address
 * @param {String} address
 */
function checkStringInputAddress(input) {
    if (!bitcore.Address.isValid(input, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
        !bitcore.Address.isValid(input, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
        return false;
    }
    configs.address = input;
    configs.status = 1;
    configs.level = 1;
    configs.cipherTxt = '';
    configs.vSalt = '';
    configs.rounds = 0;
    return true;
}

function openWalletForAddress(event) {
    var input = event.target.value;
    if (!checkStringInputAddress(input)) {
        showError("ImportAddressError", 2);
    } else {
        wallet = new WebWallet();
        showError("WalletOpenLevel1", 0);
        $('#address').html(configs.address.toString());
        $('#appinput').hide();
        $('#userinfo').show();
        ui.htmlUISendCoin();
    }
}

/**
 * Check input JSON and update status
 * @param: JSON variable {address, cipherTxt, vSalt, rounds}
 */
function checkJSONInputKeyFile(input) {
    var address = bitcore.Address.fromString(input.address);
    var cipher = input.cipherTxt + ''; //conversion to String
    var salt = input.vSalt + '';
    if (!bitcore.Address.isValid(address, bitcore.Networks.livenet, bitcore.Address.PayToPublicKeyHash) &&
        !bitcore.Address.isValid(address, bitcore.Networks.livenet, bitcore.Address.PayToScriptHash)) {
        return false;
    }
    if (input.rounds < 25000) {
        return false;
    }
    if (cipher.length != 128) {
        return false;
    }
    if (salt.length != 16) {
        return false;
    }
    configs.address = address.toString();
    configs.cipherTxt = cipher;
    configs.vSalt = salt;
    configs.rounds = input.rounds;
    configs.status = 1;
    configs.level = 2;
    return true;
}

/**
 * Open and read file from local PC
 * @param: path of file. Example file:///C:/your/path/to/file.txt
 */
var openWalletFromKeyJSONFile = function (event) {
    var input = event.target;
    var reader = new FileReader();
    reader.onload = function () {
        var text = reader.result;
        try {
            var inputJSONparse = JSON.parse(text);
            if (!checkJSONInputKeyFile(inputJSONparse)) {
                showError("ImportKeyContentError", 2);
            } else {
                wallet = new WebWallet();
                showError("WalletOpenLevel2", 0);
                $('#address').html(configs.address.toString());
                $('#appinput').hide();
                $('#userinfo').show();
                ui.htmlUISendCoin();
            }
        } catch (e) {
            showError("ReadJSONError", 2);
        }
    };
    reader.onerror = function () {
        showError("ReadJSONNotPermission", 2);
    }
    reader.readAsText(input.files[0]);
};
