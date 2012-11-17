/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function OperatorVariant() {
  var gNetwork = null;
  var cset = null;

  // Ensure Home Network Identity data.
  function ensureHNI() {
    var iccInfo = mobileConnection.iccInfo;
    if (!iccInfo) {
      return;
    }

    if (gNetwork &&
        gNetwork.mcc == iccInfo.mcc &&
        gNetwork.mnc == iccInfo.mnc) {
      return;
    }

    gNetwork = {};
    gNetwork.mcc = iccInfo.mcc;
    gNetwork.mnc = iccInfo.mnc;
    applyOperatorVariantSettings();
  };

  function handleSettingsReady(key, value) {
    cset[key] = value;
    ensureHNI();
    applyOperatorVariantSettings();
  };

  function applyOperatorVariantSettings() {
    if (!cset['operatorvariant.mcc'] ||
        !cset['operatorvariant.mnc']) {
      return;
    }
    if (gNetwork.mcc == 0 && gNetwork.mnc == 0) {
      return;
    }
    if ((gNetwork.mcc == cset['operatorvariant.mcc']) &&
        (gNetwork.mnc == cset['operatorvariant.mnc'])) {
      return;
    }

    // new SIM card
    cset['operatorvariant.mcc'] = gNetwork.mcc;
    cset['operatorvariant.mnc'] = gNetwork.mnc;
    retrieveOperatorVariantSettings(function onsuccess(result) {
      var prefNames = {
        'default': {
          'ril.data.carrier': 'carrier',
          'ril.data.apn': 'apn',
          'ril.data.user': 'user',
          'ril.data.passwd': 'password',
          'ril.data.httpProxyHost': 'proxy',
          'ril.data.httpProxyPort': 'port',
          'ro.moz.ril.iccmbdn': 'voicemail'
        },
        'supl': {
          'ril.supl.carrier': 'carrier',
          'ril.supl.apn': 'apn',
          'ril.supl.user': 'user',
          'ril.supl.passwd': 'password',
          'ril.supl.httpProxyHost': 'proxy',
          'ril.supl.httpProxyPort': 'port',
        },
        'mms': {
          'ril.data.mmsc': 'mmsc',
          'ril.data.mmsproxy': 'mmsproxy',
          'ril.data.mmsport': 'mmsport'
        }
      };

      for (var type in prefNames) {
        var apn = {};
        for (var i = 0; i < result.length; i++) {
          if (result[i].type.indexOf(type) != -1) {
            apn = result[i];
            break;
          }
        }
        var settings = prefNames[type];
        for (var key in settings) {
          var name = prefNames[type][key];
          cset[key] = apn[name] || '';
        }
      }

      storeSettings();
    });
  };

  function retrieveOperatorVariantSettings(callback) {
    var OPERATOR_VARIANT_FILE = 'shared/resources/apn.json';

    // load and query APN database, then trigger callback on results
    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var apn = xhr.response;
        var mcc = parseInt(cset['operatorvariant.mcc'], 10);
        var mnc = parseInt(cset['operatorvariant.mnc'], 10);
        // get a list of matching APNs
        var compatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
        callback(compatibleAPN);
      }
    };
    xhr.send();
  }

  var settings = window.navigator.mozSettings;
  if (!settings) {
    return;
  }
  var mobileConnection = window.navigator.mozMobileConnection;
  if (!mobileConnection) {
    return;
  }

  function storeSettings() {
    var transaction = settings.createLock();
    transaction.set(cset);
  };

  function onerrorRequest() {
  };

  cset = {};
  var transaction = settings.createLock();

  var mcc_request = transaction.get('operatorvariant.mcc');
  mcc_request.onsuccess = function() {
    var value = -1;
    if (mcc_request.result['operatorvariant.mcc']) {
      value = mcc_request.result['operatorvariant.mcc'];
    }
    handleSettingsReady('operatorvariant.mcc', value);
  };
  mcc_request.onerror = onerrorRequest;

  var mnc_request = transaction.get('operatorvariant.mnc');
  mnc_request.onsuccess = function() {
    var value = -1;
    if (mnc_request.result['operatorvariant.mnc']) {
      value = mnc_request.result['operatorvariant.mnc'];
    }
    handleSettingsReady('operatorvariant.mnc', value);
  };
  mnc_request.onerror = onerrorRequest;

  mobileConnection.addEventListener('iccinfochange', ensureHNI);
})();

