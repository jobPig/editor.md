(function() {

    var factory = function (exports) {

        var pluginName   = "image-dialog";
        exports.fn.imageDialog = function() {
            var _this       = this;
            var cm          = this.cm;
            var lang        = this.lang;
            var editor      = this.editor;
            var settings    = this.settings;
            var cursor      = cm.getCursor();
            var selection   = cm.getSelection();
            var imageLang   = lang.dialog.image;
            var classPrefix = this.classPrefix;
            var iframeName  = classPrefix + "image-iframe";
            var dialogName  = classPrefix + pluginName, dialog;
            cm.focus();
            var loading = function (show) {
                var _loading = dialog.find('.' + classPrefix + 'dialog-mask');
                _loading[(show) ? 'show' : 'hide']();
            }
            if (editor.find('.' + dialogName).length < 1) {
                var guid   = (new Date).getTime();
                var action = settings.imageUploadURL + (settings.imageUploadURL.indexOf("?") >= 0 ? "&" : "?") + "guid=" + guid;

                if (settings.crossDomainUpload)
                {
                    action += "&callback=" + settings.uploadCallbackURL + "&dialog_id=editormd-image-dialog-" + guid;
                }

                var dialogContent = ( (settings.imageUpload) ? "<form action=\"" + action +"\" target=\"" + iframeName + "\" method=\"post\" enctype=\"multipart/form-data\" class=\"" + classPrefix + "form\">" : "<div class=\"" + classPrefix + "form\">" ) +
                                        ( (settings.imageUpload) ? "<iframe name=\"" + iframeName + "\" id=\"" + iframeName + "\" guid=\"" + guid + "\"></iframe>" : "" ) +
                                        "<label>" + imageLang.url + "</label>" +
                                        "<input type=\"text\" data-url />" + (function(){
                                            return (settings.imageUpload) ? "<div class=\"" + classPrefix + "file-input\">" +
                                                                                "<input type=\"file\" name=\"" + classPrefix + "image-file\" accept=\"image/*\" />" +
                                                                                "<input type=\"submit\" value=\"" + imageLang.uploadButton + "\" />" +
                                                                            "</div>" : "";
                                        })() +
                                        "<br/>" +
                                        "<label>" + imageLang.alt + "</label>" +
                                        "<input type=\"text\" value=\"" + selection + "\" data-alt />" +
                                        "<br/>" +
                                        "<label>" + imageLang.link + "</label>" +
                                        "<input type=\"text\" value=\"http://\" data-link />" +
                                        "<br/>" +
                                    ( (settings.imageUpload) ? "</form>" : "</div>");

                dialog = this.createDialog({
                    title: imageLang.title,
                    width: (settings.imageUpload) ? 465 : 380,
                    height: 254,
                    name: dialogName,
                    content: dialogContent,
                    mask: settings.dialogShowMask,
                    drag: settings.dialogDraggable,
                    lockScreen: settings.dialogLockScreen,
                    maskStyle: {
                        opacity: settings.dialogMaskOpacity,
                        backgroundColor: settings.dialogMaskBgColor
                    },
                    buttons: {
                        enter: [lang.buttons.enter, function () {
                            var url = this.find('[data-url]').val();
                            var alt = this.find('[data-alt]').val();
                            var link = this.find('[data-link]').val();
                            if (url === '') {
                                alert(imageLang.imageURLEmpty);
                                return false;
                            }
                            var altAttr = (alt !== '') ? ' "' + alt + '"' : '';
                            var arr_url = url.split('$$');
                            var text = '';
                            for (var i = 0, length = arr_url.length; i < length; i++) {
                                if (link === '' || link === 'http://') {
                                    text = text + '![' + alt + '](' + arr_url[i] + altAttr + ')\r\n\r\n';
                                } else {
                                    text = text + '[![' + alt + '](' + arr_url[i] + altAttr + ')](' + link + altAttr + ')\r\n\r\n';
                                }
                            }
                            cm.replaceSelection(text);
                            if (alt === '') {
                                // cm.setCursor(cursor.line, cursor.ch + 2)
                            }
                            this.hide().lockScreen(false).hideMask();
                            return false;
                        }],
                        cancel: [lang.buttons.cancel, function () {
                            this.hide().lockScreen(false).hideMask();
                            return false;
                        }]
                    }
                })
                dialog.attr('id', classPrefix + 'image-dialog-' + guid);
                if (!settings.imageUpload) {
                    return;
                }
                var Qiniu_upload = function(files, length, i) {
                    if (length > i) {
                        var promise = $.ajax({
                           url:'http://7xkjuu.com2.z0.glb.qiniucdn.com/uptoken',
                           type:'GET',
                        }).then(function(data){
                           var token = data.uptoken;
                           uploadFile(files, token, i);
                        },function(err){
                          console.log(err);
                        })
                    } else {
                        $('[name="file"]').val('');
                        loading(false);
                    }

                    var uploadFile = function (files, token, fileNo) {
                      var formdata = new FormData();
                        formdata.append('file', files[fileNo]);
                        formdata.append('key', new Date().getTime() + files[fileNo].name);
                        formdata.append('token', token);
                      var qiniudomain = 'http://7xkjuu.com2.z0.glb.qiniucdn.com/';
                        $.ajax({
                            type: 'POST',
                            url: 'http://upload.qiniu.com',
                            data: formdata,
                            dataType: 'json',
                            contentType: false,
                            processData: false
                        }).then(function(json) {
                            var oldurl = $('[data-url]').val();
                            if (oldurl === '') {
                                $('[data-url]').val(qiniudomain + json.key);
                            } else {
                                oldurl = oldurl + qiniudomain + json.key;
                                $('[data-url]').val(oldurl);
                            }
                            fileNo++;

                            Qiniu_upload(files[fileNo], length, fileNo);
                        }, function (err) {
                            console.log(err);
                        })
                    }
                }
                var submitHandler = function() {
                    var files = $("[name=\"" + classPrefix + "image-file\"]")[0].files;
                    if (files.length > 0) {
                        Qiniu_upload(files, files.length, 0);
                    }
                    return false;
                }
                var fileInput  = dialog.find("[name=\"" + classPrefix + "image-file\"]");
                // fileInput.off('change').on('change', function() {
                fileInput.on('change', function() {
                    var fileName = fileInput.val();
                    var isImage = new RegExp('(\\.(' + settings.imageFormats.join('|') + '))$'); // /(\.(webp|jpg|jpeg|gif|bmp|png))$/
                    if (fileName === '') {
                        alert(imageLang.uploadFileEmpty);
                        return false;
                    }
                    if (!isImage.test(fileName)) {
                        alert(imageLang.formatNotAllowed + settings.imageFormats.join(', '));
                        return false;
                    }
                    loading(true);
                    dialog.find('[type="submit"]').bind("click", submitHandler).trigger("click");
                })
            }
            dialog = editor.find('.' + dialogName);
            dialog.find('[type="text"]').val('');
            dialog.find('[type="file"]').val('');
            dialog.find('[data-link]').val('http://');
            this.dialogShowMask(dialog);
            this.dialogLockScreen();
            dialog.show();
        };

    };

    // CommonJS/Node.js
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object")
    {
        module.exports = factory;
    }
    else if (typeof define === "function")  // AMD/CMD/Sea.js
    {
        if (define.amd) { // for Require.js

            define(["editormd"], function(editormd) {
                factory(editormd);
            });

        } else { // for Sea.js
            define(function(require) {
                var editormd = require("./../../editormd");
                factory(editormd);
            });
        }
    }
    else
    {
        factory(window.editormd);
    }
})();
