/*
 * Copyright 2007-2013 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <http://pyd.io/>.
 */
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

(function (global) {

    var ContextConsumerMixin = {
        contextTypes: {
            messages: React.PropTypes.object,
            getMessage: React.PropTypes.func,
            isReadonly: React.PropTypes.func
        }
    };

    var MainPanel = React.createClass({
        displayName: "MainPanel",

        propTypes: {
            closeAjxpDialog: React.PropTypes.func.isRequired,
            pydio: React.PropTypes.instanceOf(Pydio).isRequired,
            selection: React.PropTypes.instanceOf(PydioDataModel).isRequired,
            readonly: React.PropTypes.bool
        },

        childContextTypes: {
            messages: React.PropTypes.object,
            getMessage: React.PropTypes.func,
            isReadonly: React.PropTypes.func
        },

        getChildContext: function getChildContext() {
            var messages = this.props.pydio.MessageHash;
            return {
                messages: messages,
                getMessage: function getMessage(messageId) {
                    var namespace = arguments.length <= 1 || arguments[1] === undefined ? 'share_center' : arguments[1];

                    try {
                        return messages[namespace + (namespace ? "." : "") + messageId] || messageId;
                    } catch (e) {
                        return messageId;
                    }
                },
                isReadonly: (function () {
                    return this.props.readonly;
                }).bind(this)
            };
        },

        refreshDialogPosition: function refreshDialogPosition() {
            global.pydio.UI.modal.refreshDialogPosition();
        },

        modelUpdated: function modelUpdated(eventData) {
            if (this.isMounted()) {
                this.setState({
                    status: eventData.status,
                    model: eventData.model
                }, (function () {
                    this.refreshDialogPosition();
                }).bind(this));
            }
        },

        getInitialState: function getInitialState() {
            return {
                status: 'idle',
                mailerData: false,
                model: new ReactModel.Share(this.props.pydio, this.props.selection.getUniqueNode(), this.props.selection)
            };
        },

        showMailer: function showMailer(subject, message) {
            var users = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

            if (ReactModel.Share.forceMailerOldSchool()) {
                subject = encodeURIComponent(subject);
                message = encodeURIComponent(message);
                global.location.href = "mailto:custom-email@domain.com?Subject=" + subject + "&Body=" + message;
                return;
            }
            global.ResourcesManager.loadClassesAndApply(['PydioMailer'], (function () {
                this.setState({
                    mailerData: {
                        subject: subject,
                        message: message,
                        users: users
                    }
                });
            }).bind(this));
        },

        dismissMailer: function dismissMailer() {
            this.setState({ mailerData: false });
        },

        componentDidMount: function componentDidMount() {
            this.state.model.observe("status_changed", this.modelUpdated);
        },

        clicked: function clicked() {
            this.props.closeAjxpDialog();
        },

        getMessage: function getMessage(key) {
            var namespace = arguments.length <= 1 || arguments[1] === undefined ? 'share_center' : arguments[1];

            return this.props.pydio.MessageHash[namespace + (namespace ? '.' : '') + key];
        },

        render: function render() {
            var model = this.state.model;
            var panels = [];
            var showMailer = ReactModel.Share.mailerActive() ? this.showMailer : null;
            var auth = ReactModel.Share.getAuthorizations(this.props.pydio);
            if (model.getNode().isLeaf() && auth.file_public_link || !model.getNode().isLeaf() && auth.folder_public_link) {
                var publicLinks = model.getPublicLinks();
                if (publicLinks.length) {
                    var linkData = publicLinks[0];
                }
                panels.push(React.createElement(
                    ReactMUI.Tab,
                    { key: "public-link", label: this.getMessage(121) + (model.hasPublicLink() ? ' (' + this.getMessage(178) + ')' : '') },
                    React.createElement(PublicLinkPanel, {
                        showMailer: showMailer,
                        linkData: linkData,
                        pydio: this.props.pydio,
                        shareModel: model,
                        authorizations: auth
                    })
                ));
            }
            if (model.getNode().isLeaf() && auth.file_workspaces || !model.getNode().isLeaf() && auth.folder_workspaces) {
                var users = model.getSharedUsers();
                var ocsUsers = model.getOcsLinks();
                var totalUsers = users.length + ocsUsers.length;
                panels.push(React.createElement(
                    ReactMUI.Tab,
                    { key: "target-users", label: this.getMessage(249, '') + (totalUsers ? ' (' + totalUsers + ')' : '') },
                    React.createElement(UsersPanel, {
                        showMailer: showMailer,
                        shareModel: model
                    })
                ));
            }
            if (panels.length > 0) {
                panels.push(React.createElement(
                    ReactMUI.Tab,
                    { key: "share-permissions", label: this.getMessage(486, '') },
                    React.createElement(AdvancedPanel, {
                        showMailer: showMailer,
                        pydio: this.props.pydio,
                        shareModel: model
                    })
                ));
            }
            if (this.state.mailerData) {
                var mailer = React.createElement(PydioMailer.Pane, _extends({}, this.state.mailerData, {
                    onDismiss: this.dismissMailer,
                    overlay: true,
                    className: "share-center-mailer",
                    panelTitle: this.props.pydio.MessageHash["share_center.45"]
                }));
            }

            return React.createElement(
                "div",
                { style: { width: 420 } },
                React.createElement(HeaderPanel, _extends({}, this.props, { shareModel: this.state.model })),
                React.createElement(
                    ReactMUI.Tabs,
                    { onChange: this.refreshDialogPosition },
                    panels
                ),
                React.createElement(ButtonsPanel, _extends({}, this.props, { shareModel: this.state.model, onClick: this.clicked })),
                mailer
            );
        }

    });

    var HeaderPanel = React.createClass({
        displayName: "HeaderPanel",

        mixins: [ContextConsumerMixin],
        render: function render() {

            var nodePath = this.props.shareModel.getNode().getPath();
            if (this.props.shareModel.getNode().getMetadata().get("original_path")) {
                nodePath = this.props.shareModel.getNode().getMetadata().get("original_path");
            }
            return React.createElement(
                "div",
                { className: "headerPanel" },
                React.createElement(
                    "div",
                    {
                        style: { fontSize: 24, color: 'white', padding: '20px 16px 14px', wordBreak: 'break-all' }
                    },
                    this.context.getMessage('44').replace('%s', PathUtils.getBasename(nodePath))
                )
            );
        }
    });

    var ButtonsPanel = React.createClass({
        displayName: "ButtonsPanel",

        mixins: [ContextConsumerMixin],

        propTypes: {
            onClick: React.PropTypes.func.isRequired
        },
        triggerModelSave: function triggerModelSave() {
            this.props.shareModel.save();
        },
        triggerModelRevert: function triggerModelRevert() {
            this.props.shareModel.revertChanges();
        },
        disableAllShare: function disableAllShare() {
            this.props.shareModel.stopSharing(this.props.onClick.bind(this));
        },
        render: function render() {
            if (this.props.shareModel.getStatus() == 'modified') {
                return React.createElement(
                    "div",
                    { style: { padding: 16, textAlign: 'right' } },
                    React.createElement(
                        "a",
                        { className: "revert-button", onClick: this.triggerModelRevert },
                        this.context.getMessage('179')
                    ),
                    React.createElement(ReactMUI.FlatButton, { secondary: true, label: this.context.getMessage('53', ''), onClick: this.triggerModelSave }),
                    React.createElement(ReactMUI.FlatButton, { secondary: false, label: this.context.getMessage('86', ''), onClick: this.props.onClick })
                );
            } else {
                var unshareButton;
                if (this.props.shareModel.hasActiveShares() && this.props.shareModel.currentIsOwner() || this.props.shareModel.getStatus() === 'error') {
                    unshareButton = React.createElement(ReactMUI.FlatButton, { secondary: true, label: this.context.getMessage('6'), onClick: this.disableAllShare });
                }
                return React.createElement(
                    "div",
                    { style: { padding: 16, textAlign: 'right' } },
                    unshareButton,
                    React.createElement(ReactMUI.FlatButton, { secondary: false, label: this.context.getMessage('86', ''), onClick: this.props.onClick })
                );
            }
        }
    });

    /**************************/
    /* USERS PANEL
    /**************************/
    var UsersPanel = React.createClass({
        displayName: "UsersPanel",

        mixins: [ContextConsumerMixin],

        propTypes: {
            shareModel: React.PropTypes.instanceOf(ReactModel.Share),
            showMailer: React.PropTypes.func
        },
        onUserUpdate: function onUserUpdate(operation, userId, userData) {
            this.props.shareModel.updateSharedUser(operation, userId, userData);
        },
        onSaveSelection: function onSaveSelection() {
            var label = window.prompt(this.context.getMessage(510, ''));
            if (!label) return;
            this.props.shareModel.saveSelectionAsTeam(label);
        },
        sendInvitations: function sendInvitations(userObjects) {
            var mailData = this.props.shareModel.prepareEmail("repository");
            this.props.showMailer(mailData.subject, mailData.message, userObjects);
        },

        render: function render() {
            var currentUsers = this.props.shareModel.getSharedUsers();
            var federatedEnabled = ReactModel.Share.federatedSharingEnabled();
            if (federatedEnabled) {
                var remoteUsersBlock = React.createElement(RemoteUsers, {
                    shareModel: this.props.shareModel,
                    onUserUpdate: this.onUserUpdate
                });
            }
            return React.createElement(
                "div",
                { style: federatedEnabled ? { padding: '0 16px 10px' } : { padding: '20px 16px 10px' } },
                React.createElement(SharedUsers, {
                    showTitle: federatedEnabled,
                    users: currentUsers,
                    userObjects: this.props.shareModel.getSharedUsersAsObjects(),
                    sendInvitations: this.props.showMailer ? this.sendInvitations : null,
                    onUserUpdate: this.onUserUpdate,
                    saveSelectionAsTeam: PydioUsers.Client.saveSelectionSupported() ? this.onSaveSelection : null
                }),
                remoteUsersBlock
            );
        }
    });

    var UserBadge = React.createClass({
        displayName: "UserBadge",

        propTypes: {
            label: React.PropTypes.string,
            avatar: React.PropTypes.string,
            type: React.PropTypes.string,
            menus: React.PropTypes.object
        },
        getInitialState: function getInitialState() {
            return { showMenu: false };
        },
        showMenu: function showMenu() {
            this.setState({ showMenu: true });
        },
        /****************************/
        /* WARNING: PROTOTYPE CODE
         */
        hideMenu: function hideMenu(event) {
            if (event && (event.target.hasClassName('mui-icon-button') || event.target.up('.mui-icon-button'))) {
                var tg = event.target.hasClassName('mui-icon-button') ? event.target : event.target.up('.mui-icon-button');
                if (this.refs["menuButton"] && tg == this.refs["menuButton"].getDOMNode()) {
                    return;
                }
            }
            this.setState({ showMenu: false });
        },
        componentDidMount: function componentDidMount() {
            this._observer = this.hideMenu.bind(this);
            document.observe('click', this._observer);
        },
        componentWillUnmount: function componentWillUnmount() {
            document.stopObserving('click', this._observer);
        },
        /*
        /* END PROTOTYPE CODE
        /***************************/

        menuClicked: function menuClicked(event, index, menuItem) {
            if (menuItem.payload) {
                menuItem.payload();
            }
            this.hideMenu();
        },
        renderMenu: function renderMenu() {
            if (!this.props.menus || !this.props.menus.length) {
                return null;
            }
            var menuAnchor = React.createElement(ReactMUI.IconButton, { ref: "menuButton", iconClassName: "icon-ellipsis-vertical", onClick: this.showMenu });
            if (this.state.showMenu) {
                var menuItems = this.props.menus.map(function (m) {
                    var text = m.text;
                    if (m.checked) {
                        text = React.createElement(
                            "span",
                            null,
                            React.createElement("span", { className: "icon-check" }),
                            m.text
                        );
                    }
                    return { text: text, payload: m.callback };
                });
                var menuBox = React.createElement(ReactMUI.Menu, { onItemClick: this.menuClicked, zDepth: 0, menuItems: menuItems });
            }
            return React.createElement(
                "div",
                { className: "user-badge-menu-box" },
                menuAnchor,
                menuBox
            );
        },

        render: function render() {
            var avatar;
            /*
            if (this.props.avatar) {
                avatar = (
                    <span className="user-badge-avatar">
                        <img src="" width={40} height={40}
                             src={global.pydio.Parameters.get('ajxpServerAccess')+'&get_action=get_binary_param&binary_id='+this.props.avatar}/>
                    </span>
                );
            }else{
                avatar = <span className="icon-user"/>;
            }*/
            if (this.props.type == 'group') {
                avatar = React.createElement("span", { className: "avatar icon-group" });
            } else if (this.props.type == 'temporary') {
                avatar = React.createElement("span", { className: "avatar icon-plus" });
            } else if (this.props.type == 'remote_user') {
                avatar = React.createElement("span", { className: "avatar icon-cloud" });
            } else {
                avatar = React.createElement("span", { className: "avatar icon-user" });
            }
            var menu = this.renderMenu();
            return React.createElement(
                "div",
                { className: "user-badge user-type-" + this.props.type },
                avatar,
                React.createElement(
                    "span",
                    { className: "user-badge-label" },
                    this.props.label
                ),
                this.props.children,
                menu
            );
        }
    });

    var SharedUsers = React.createClass({
        displayName: "SharedUsers",

        mixins: [ContextConsumerMixin],

        propTypes: {
            users: React.PropTypes.array.isRequired,
            userObjects: React.PropTypes.object.isRequired,
            onUserUpdate: React.PropTypes.func.isRequired,
            saveSelectionAsTeam: React.PropTypes.func,
            sendInvitations: React.PropTypes.func,
            showTitle: React.PropTypes.bool
        },
        sendInvitationToAllUsers: function sendInvitationToAllUsers() {
            this.props.sendInvitations(this.props.userObjects);
        },
        clearAllUsers: function clearAllUsers() {
            this.props.users.map((function (entry) {
                this.props.onUserUpdate('remove', entry.ID, entry);
            }).bind(this));
        },
        valueSelected: function valueSelected(id, label, type) {
            var newEntry = {
                ID: id,
                RIGHT: 'r',
                LABEL: label,
                TYPE: type
            };
            this.props.onUserUpdate('add', newEntry.ID, newEntry);
        },
        completerRenderSuggestion: function completerRenderSuggestion(userObject) {
            return React.createElement(UserBadge, {
                label: userObject.getExtendedLabel() || userObject.getLabel(),
                avatar: userObject.getAvatar(),
                type: userObject.getGroup() ? 'group' : userObject.getTemporary() ? 'temporary' : userObject.getExternal() ? 'tmp_user' : 'user'
            });
        },

        render: function render() {
            // sort by group/user then by ID;
            var userEntries = this.props.users.sort(function (a, b) {
                return b.TYPE == "group" ? 1 : a.TYPE == "group" ? -1 : a.ID > b.ID ? 1 : b.ID > a.ID ? -1 : 0;
            }).map((function (u) {
                return React.createElement(SharedUserEntry, {
                    userEntry: u,
                    userObject: this.props.userObjects[u.ID],
                    key: u.ID,
                    shareModel: this.props.shareModel,
                    onUserUpdate: this.props.onUserUpdate,
                    sendInvitations: this.props.sendInvitations
                });
            }).bind(this));
            var actionLinks = [];
            if (this.props.users.length && !this.context.isReadonly()) {
                actionLinks.push(React.createElement(
                    "a",
                    { key: "clear", onClick: this.clearAllUsers },
                    this.context.getMessage('180')
                ));
            }
            if (this.props.sendInvitations && this.props.users.length) {
                actionLinks.push(React.createElement(
                    "a",
                    { key: "invite", onClick: this.sendInvitationToAllUsers },
                    this.context.getMessage('45')
                ));
            }
            if (this.props.saveSelectionAsTeam && this.props.users.length > 1 && !this.context.isReadonly()) {
                actionLinks.push(React.createElement(
                    "a",
                    { key: "team", onClick: this.props.saveSelectionAsTeam },
                    this.context.getMessage('509', '')
                ));
            }
            if (actionLinks.length) {
                var linkActions = React.createElement(
                    "div",
                    { className: "additional-actions-links" },
                    actionLinks
                );
            }
            var rwHeader;
            if (this.props.users.length) {
                rwHeader = React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "div",
                        { className: "shared-users-rights-header" },
                        React.createElement(
                            "span",
                            { className: "read" },
                            this.context.getMessage('361', '')
                        ),
                        React.createElement(
                            "span",
                            { className: "read" },
                            this.context.getMessage('181')
                        )
                    )
                );
            }
            if (!this.context.isReadonly()) {
                var excludes = this.props.users.map(function (u) {
                    return u.ID;
                });
                var usersInput = React.createElement(UsersCompleter.Input, {
                    className: "share-form-users",
                    fieldLabel: this.context.getMessage('34'),
                    renderSuggestion: this.completerRenderSuggestion,
                    onValueSelected: this.valueSelected,
                    excludes: excludes
                });
            }
            var title;
            if (this.props.showTitle) {
                title = React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('217')
                );
            }
            return React.createElement(
                "div",
                null,
                title,
                React.createElement(
                    "div",
                    { className: "section-legend" },
                    this.context.getMessage('182')
                ),
                usersInput,
                rwHeader,
                React.createElement(
                    "div",
                    null,
                    userEntries
                ),
                linkActions
            );
        }
    });

    var SharedUserEntry = React.createClass({
        displayName: "SharedUserEntry",

        mixins: [ContextConsumerMixin],

        propTypes: {
            userEntry: React.PropTypes.object.isRequired,
            userObject: React.PropTypes.instanceOf(PydioUsers.User).isRequired,
            onUserUpdate: React.PropTypes.func.isRequired,
            sendInvitations: React.PropTypes.func
        },
        onRemove: function onRemove() {
            this.props.onUserUpdate('remove', this.props.userEntry.ID, this.props.userEntry);
        },
        onToggleWatch: function onToggleWatch() {
            this.props.onUserUpdate('update_right', this.props.userEntry.ID, { right: 'watch', add: !this.props.userEntry['WATCH'] });
        },
        onInvite: function onInvite() {
            var targets = {};
            targets[this.props.userObject.getId()] = this.props.userObject;
            this.props.sendInvitations(targets);
        },
        onUpdateRight: function onUpdateRight(event) {
            var target = event.target;
            this.props.onUserUpdate('update_right', this.props.userEntry.ID, { right: target.name, add: target.checked });
        },
        render: function render() {
            var menuItems = [];
            if (this.props.userEntry.TYPE != 'group') {
                if (!this.context.isReadonly()) {
                    // Toggle Notif
                    menuItems.push({
                        text: this.context.getMessage('183'),
                        callback: this.onToggleWatch,
                        checked: this.props.userEntry.WATCH
                    });
                }
                if (this.props.sendInvitations) {
                    // Send invitation
                    menuItems.push({
                        text: this.context.getMessage('45'),
                        callback: this.onInvite
                    });
                }
            }
            if (!this.context.isReadonly()) {
                // Remove Entry
                menuItems.push({
                    text: this.context.getMessage('257', ''),
                    callback: this.onRemove
                });
            }
            return React.createElement(
                UserBadge,
                {
                    label: this.props.userEntry.LABEL || this.props.userEntry.ID,
                    avatar: this.props.userEntry.AVATAR,
                    type: this.props.userEntry.TYPE,
                    menus: menuItems
                },
                React.createElement(
                    "span",
                    { className: "user-badge-rights-container" },
                    React.createElement("input", { type: "checkbox", name: "read", disabled: this.context.isReadonly(), checked: this.props.userEntry.RIGHT.indexOf('r') !== -1, onChange: this.onUpdateRight }),
                    React.createElement("input", { type: "checkbox", name: "write", disabled: this.context.isReadonly(), checked: this.props.userEntry.RIGHT.indexOf('w') !== -1, onChange: this.onUpdateRight })
                )
            );
        }
    });

    var RemoteUsers = React.createClass({
        displayName: "RemoteUsers",

        mixins: [ContextConsumerMixin],

        propTypes: {
            shareModel: React.PropTypes.instanceOf(ReactModel.Share),
            onUserUpdate: React.PropTypes.func.isRequired
        },

        getInitialState: function getInitialState() {
            return { addDisabled: true };
        },

        addUser: function addUser() {
            var h = this.refs["host"].getValue();
            var u = this.refs["user"].getValue();
            this.props.shareModel.createRemoteLink(h, u);
        },

        removeUser: function removeUser(linkId) {
            this.props.shareModel.removeRemoteLink(linkId);
        },

        monitorInput: function monitorInput() {
            var h = this.refs["host"].getValue();
            var u = this.refs["user"].getValue();
            this.setState({ addDisabled: !(h && u) });
        },

        renderForm: function renderForm() {
            if (this.context.isReadonly()) {
                return null;
            }
            return React.createElement(
                "div",
                { className: "remote-users-add reset-pydio-forms" },
                React.createElement(ReactMUI.TextField, { className: "host", ref: "host", floatingLabelText: this.context.getMessage('209'), onChange: this.monitorInput }),
                React.createElement(ReactMUI.TextField, { className: "user", ref: "user", type: "text", floatingLabelText: this.context.getMessage('210'), onChange: this.monitorInput }),
                React.createElement(ReactMUI.IconButton, { tooltip: this.context.getMessage('45'), iconClassName: "icon-plus-sign", onClick: this.addUser, disabled: this.state.addDisabled })
            );
        },

        render: function render() {
            var ocsLinks = this.props.shareModel.getOcsLinksByStatus(),
                inv,
                rwHeader,
                hasActiveOcsLink = false;

            inv = ocsLinks.map((function (link) {
                hasActiveOcsLink = !hasActiveOcsLink && link && link.invitation && link.invitation.STATUS == 2 ? true : hasActiveOcsLink;

                return React.createElement(RemoteUserEntry, {
                    shareModel: this.props.shareModel,
                    linkData: link,
                    onRemoveUser: this.removeUser,
                    onUserUpdate: this.props.onUserUpdate
                });
            }).bind(this));

            if (hasActiveOcsLink) {
                rwHeader = React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "div",
                        { className: "shared-users-rights-header" },
                        React.createElement(
                            "span",
                            { className: "read" },
                            this.context.getMessage('361', '')
                        ),
                        React.createElement(
                            "span",
                            { className: "read" },
                            this.context.getMessage('181')
                        )
                    )
                );
            }

            return React.createElement(
                "div",
                { style: { marginTop: 16 } },
                React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('207')
                ),
                React.createElement(
                    "div",
                    { className: "section-legend" },
                    this.context.getMessage('208')
                ),
                this.renderForm(),
                React.createElement(
                    "div",
                    null,
                    rwHeader,
                    inv
                )
            );
        }
    });

    var RemoteUserEntry = React.createClass({
        displayName: "RemoteUserEntry",

        mixins: [ContextConsumerMixin],

        propTypes: {
            shareModel: React.PropTypes.instanceOf(ReactModel.Share),
            linkData: React.PropTypes.object.isRequired,
            onRemoveUser: React.PropTypes.func.isRequired,
            onUserUpdate: React.PropTypes.func.isRequired
        },

        getInitialState: function getInitialState() {
            return {
                internalUser: this.props.shareModel.getSharedUser(this.props.linkData['internal_user_id'])
            };
        },

        componentWillReceiveProps: function componentWillReceiveProps(newProps, oldProps) {
            this.setState({
                internalUser: newProps.shareModel.getSharedUser(newProps.linkData['internal_user_id'])
            });
        },

        getStatus: function getStatus() {
            var link = this.props.linkData;
            if (!link.invitation) return -1;else return link.invitation.STATUS;
        },

        getStatusString: function getStatusString() {
            var statuses = { 's-1': 214, 's1': 211, 's2': 212, 's4': 213 };
            return this.context.getMessage(statuses['s' + this.getStatus()]);
        },

        buildLabel: function buildLabel() {
            var link = this.props.linkData;
            var host = link.HOST || link.invitation.HOST;
            var user = link.USER || link.invitation.USER;
            return user + " @ " + host;
        },

        removeUser: function removeUser() {
            this.props.onRemoveUser(this.props.linkData['hash']);
        },

        onUpdateRight: function onUpdateRight(event) {
            var target = event.target;
            this.props.onUserUpdate('update_right', this.state.internalUser.ID, { right: target.name, add: target.checked });
        },

        render: function render() {
            var menuItems = [];
            if (!this.context.isReadonly()) {
                menuItems = [{
                    text: this.context.getMessage('257', ''),
                    callback: this.removeUser
                }];
            }
            var status = this.getStatus();
            var additionalItem;
            if (status == 2) {
                additionalItem = React.createElement(
                    "span",
                    { className: "user-badge-rights-container" },
                    React.createElement("input", { type: "checkbox", name: "read", disabled: this.context.isReadonly(), checked: this.state.internalUser.RIGHT.indexOf('r') !== -1, onChange: this.onUpdateRight }),
                    React.createElement("input", { type: "checkbox", name: "write", disabled: this.context.isReadonly(), checked: this.state.internalUser.RIGHT.indexOf('w') !== -1, onChange: this.onUpdateRight })
                );
            } else {
                additionalItem = React.createElement(
                    "span",
                    { className: "user-badge-rights-container" },
                    this.getStatusString()
                );
            }

            return React.createElement(
                UserBadge,
                {
                    label: this.buildLabel(),
                    avatar: null,
                    type: "remote_user",
                    menus: menuItems
                },
                additionalItem
            );
        }

    });

    /**************************/
    /* PUBLIC LINK PANEL
     /**************************/
    var PublicLinkPanel = React.createClass({
        displayName: "PublicLinkPanel",

        mixins: [ContextConsumerMixin],

        propTypes: {
            linkData: React.PropTypes.object,
            pydio: React.PropTypes.instanceOf(Pydio),
            shareModel: React.PropTypes.instanceOf(ReactModel.Share),
            authorizations: React.PropTypes.object,
            showMailer: React.PropTypes.func
        },

        toggleLink: function toggleLink() {
            var publicLinks = this.props.shareModel.getPublicLinks();
            if (this.state.showTemporaryPassword) {
                this.setState({ showTemporaryPassword: false, temporaryPassword: null });
            } else if (!publicLinks.length && ReactModel.Share.getAuthorizations(this.props.pydio).password_mandatory) {
                this.setState({ showTemporaryPassword: true, temporaryPassword: '' });
            } else {
                this.props.shareModel.togglePublicLink();
            }
        },

        getInitialState: function getInitialState() {
            return { showTemporaryPassword: false, temporaryPassword: null };
        },

        updateTemporaryPassword: function updateTemporaryPassword(value, event) {
            if (value == undefined) value = event.currentTarget.getValue();
            this.setState({ temporaryPassword: value });
        },

        enableLinkWithPassword: function enableLinkWithPassword() {
            this.props.shareModel.enablePublicLinkWithPassword(this.state.temporaryPassword);
            this.setState({ showTemporaryPassword: false, temporaryPassword: null });
        },

        render: function render() {

            var publicLinkPanes;
            if (this.props.linkData) {
                publicLinkPanes = [React.createElement(PublicLinkField, {
                    showMailer: this.props.showMailer,
                    linkData: this.props.linkData,
                    shareModel: this.props.shareModel,
                    editAllowed: this.props.authorizations.editable_hash,
                    key: "public-link"
                }), React.createElement(PublicLinkPermissions, {
                    linkData: this.props.linkData,
                    shareModel: this.props.shareModel,
                    key: "public-perm" }), React.createElement(PublicLinkSecureOptions, {
                    linkData: this.props.linkData,
                    shareModel: this.props.shareModel,
                    pydio: this.props.pydio,
                    key: "public-secure"
                })];
            } else if (this.state.showTemporaryPassword) {
                publicLinkPanes = [React.createElement(
                    "div",
                    null,
                    React.createElement(
                        "div",
                        { className: "section-legend", style: { marginTop: 20 } },
                        this.context.getMessage('215')
                    ),
                    React.createElement(
                        "div",
                        null,
                        React.createElement(
                            "div",
                            { style: { float: 'left' } },
                            React.createElement(PydioForm.ValidPassword, {
                                attributes: { label: this.context.getMessage('23') },
                                value: this.state.temporaryPassword,
                                onChange: this.updateTemporaryPassword
                            })
                        ),
                        React.createElement(
                            "div",
                            { style: { marginLeft: 7, marginTop: 26, float: 'left' } },
                            React.createElement(ReactMUI.RaisedButton, { label: this.context.getMessage('92'), secondary: true, onClick: this.enableLinkWithPassword })
                        )
                    )
                )];
            } else {
                publicLinkPanes = [React.createElement(
                    "div",
                    { className: "section-legend", style: { marginTop: 20 } },
                    this.context.getMessage('190')
                )];
            }
            var checked = !!this.props.linkData;
            var disableForNotOwner = false;
            if (checked && !this.props.shareModel.currentIsOwner()) {
                disableForNotOwner = true;
            }
            return React.createElement(
                "div",
                { style: { padding: 16 }, className: "reset-pydio-forms ie_material_checkbox_fix" },
                React.createElement(ReactMUI.Checkbox, {
                    disabled: this.context.isReadonly() || disableForNotOwner,
                    onCheck: this.toggleLink,
                    checked: !!this.props.linkData || this.state.showTemporaryPassword,
                    label: this.context.getMessage('189')
                }),
                publicLinkPanes
            );
        }
    });

    var PublicLinkField = React.createClass({
        displayName: "PublicLinkField",

        mixins: [ContextConsumerMixin],

        propTypes: {
            linkData: React.PropTypes.object.isRequired,
            shareModel: React.PropTypes.instanceOf(ReactModel.Share),
            editAllowed: React.PropTypes.bool,
            onChange: React.PropTypes.func,
            showMailer: React.PropTypes.func
        },
        getInitialState: function getInitialState() {
            return { editLink: false, copyMessage: '' };
        },
        toggleEditMode: function toggleEditMode() {
            if (this.state.editLink && this.state.customLink) {
                this.props.shareModel.updateCustomLink(this.props.linkData.hash, this.state.customLink);
            }
            this.setState({ editLink: !this.state.editLink });
        },
        changeLink: function changeLink(event) {
            this.setState({ customLink: event.target.value });
        },
        clearCopyMessage: function clearCopyMessage() {
            global.setTimeout((function () {
                this.setState({ copyMessage: '' });
            }).bind(this), 5000);
        },

        attachClipboard: function attachClipboard() {
            this.detachClipboard();
            if (this.refs['copy-button']) {
                this._clip = new Clipboard(this.refs['copy-button'].getDOMNode(), {
                    text: (function (trigger) {
                        return this.props.linkData['public_link'];
                    }).bind(this)
                });
                this._clip.on('success', (function () {
                    this.setState({ copyMessage: this.context.getMessage('192') }, this.clearCopyMessage);
                }).bind(this));
                this._clip.on('error', (function () {
                    var copyMessage;
                    if (global.navigator.platform.indexOf("Mac") === 0) {
                        copyMessage = this.context.getMessage('144');
                    } else {
                        copyMessage = this.context.getMessage('143');
                    }
                    this.refs['public-link-field'].focus();
                    this.setState({ copyMessage: copyMessage }, this.clearCopyMessage);
                }).bind(this));
            }
        },
        detachClipboard: function detachClipboard() {
            if (this._clip) {
                this._clip.destroy();
            }
        },

        componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
            this.attachClipboard();
        },

        componentDidMount: function componentDidMount() {
            this.attachClipboard();
        },

        componentWillUnmount: function componentWillUnmount() {
            this.detachClipboard();
        },

        openMailer: function openMailer() {
            var mailData = this.props.shareModel.prepareEmail("link", this.props.linkData.hash);
            this.props.showMailer(mailData.subject, mailData.message, []);
        },

        render: function render() {
            var publicLink = this.props.linkData['public_link'];
            var editAllowed = this.props.editAllowed && !this.props.linkData['hash_is_shorten'] && !this.context.isReadonly() && this.props.shareModel.currentIsOwner();
            if (this.state.editLink && editAllowed) {
                return React.createElement(
                    "div",
                    { className: "public-link-container edit-link" },
                    React.createElement(
                        "span",
                        null,
                        publicLink.split('://')[0],
                        "://[..]/",
                        PathUtils.getBasename(PathUtils.getDirname(publicLink)) + '/'
                    ),
                    React.createElement(ReactMUI.TextField, { onChange: this.changeLink, value: this.state.customLink !== undefined ? this.state.customLink : this.props.linkData['hash'] }),
                    React.createElement(ReactMUI.RaisedButton, { label: "Ok", onClick: this.toggleEditMode }),
                    React.createElement(
                        "div",
                        { className: "section-legend" },
                        this.context.getMessage('194')
                    )
                );
            } else {
                var copyButton = React.createElement("span", { ref: "copy-button", className: "copy-link-button icon-paste", title: this.context.getMessage('191') });
                var setHtml = (function () {
                    return { __html: this.state.copyMessage };
                }).bind(this);
                var focus = function focus(e) {
                    e.target.select();
                };
                var actionLinks = [];
                if (this.props.showMailer) {
                    actionLinks.push(React.createElement(
                        "a",
                        { key: "invitation", onClick: this.openMailer },
                        this.context.getMessage('45')
                    ));
                }
                if (editAllowed) {
                    actionLinks.push(React.createElement(
                        "a",
                        { key: "customize", onClick: this.toggleEditMode },
                        this.context.getMessage('193')
                    ));
                }
                if (actionLinks.length) {
                    actionLinks = React.createElement(
                        "div",
                        { className: "additional-actions-links" },
                        actionLinks
                    );
                } else {
                    actionLinks = null;
                }
                return React.createElement(
                    "div",
                    { className: "public-link-container" },
                    React.createElement(ReactMUI.TextField, {
                        className: "public-link" + (this.props.linkData['is_expired'] ? ' link-expired' : ''),
                        type: "text",
                        name: "Link",
                        ref: "public-link-field",
                        value: publicLink,
                        onFocus: focus
                    }),
                    " ",
                    copyButton,
                    React.createElement("div", { style: { textAlign: 'center' }, className: "section-legend", dangerouslySetInnerHTML: setHtml() }),
                    actionLinks
                );
            }
        }
    });

    var PublicLinkPermissions = React.createClass({
        displayName: "PublicLinkPermissions",

        mixins: [ContextConsumerMixin],

        propTypes: {
            linkData: React.PropTypes.object.isRequired,
            shareModel: React.PropTypes.instanceOf(ReactModel.Share)
        },

        changePermission: function changePermission(event) {
            var name = event.target.name;
            var checked = event.target.checked;
            this.props.shareModel.setPublicLinkPermission(this.props.linkData.hash, name, checked);
        },

        render: function render() {
            var linkId = this.props.linkData.hash;
            var perms = [],
                previewWarning;
            var currentIsFolder = !this.props.shareModel.getNode().isLeaf();
            perms.push({
                NAME: 'read',
                LABEL: this.context.getMessage('72'),
                DISABLED: currentIsFolder && !this.props.shareModel.getPublicLinkPermission(linkId, 'write')
            });
            perms.push({
                NAME: 'download',
                LABEL: this.context.getMessage('73')
            });
            if (currentIsFolder) {
                perms.push({
                    NAME: 'write',
                    LABEL: this.context.getMessage('74')
                });
            } else if (this.props.shareModel.fileHasWriteableEditors()) {
                perms.push({
                    NAME: 'write',
                    LABEL: this.context.getMessage('74b')
                });
            }
            if (this.props.shareModel.isPublicLinkPreviewDisabled() && this.props.shareModel.getPublicLinkPermission(linkId, 'read')) {
                previewWarning = React.createElement(
                    "div",
                    null,
                    this.context.getMessage('195')
                );
            }
            return React.createElement(
                "div",
                null,
                React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('71')
                ),
                React.createElement(
                    "div",
                    { className: "section-legend" },
                    this.context.getMessage('70r')
                ),
                React.createElement(
                    "div",
                    { style: { margin: '10px 0 20px' }, className: "ie_material_checkbox_fix" },
                    perms.map((function (p) {
                        return React.createElement(
                            "div",
                            { style: { display: 'inline-block', width: '30%' } },
                            React.createElement(ReactMUI.Checkbox, {
                                disabled: p.DISABLED || this.context.isReadonly(),
                                type: "checkbox",
                                name: p.NAME,
                                label: p.LABEL,
                                onCheck: this.changePermission,
                                checked: this.props.shareModel.getPublicLinkPermission(linkId, p.NAME)
                            })
                        );
                    }).bind(this)),
                    previewWarning
                )
            );
        }
    });

    var PublicLinkSecureOptions = React.createClass({
        displayName: "PublicLinkSecureOptions",

        mixins: [ContextConsumerMixin],

        propTypes: {
            linkData: React.PropTypes.object.isRequired,
            shareModel: React.PropTypes.instanceOf(ReactModel.Share)
        },

        updateDLExpirationField: function updateDLExpirationField(event) {
            var newValue = event.currentTarget.getValue();
            this.props.shareModel.setExpirationFor(this.props.linkData.hash, "downloads", newValue);
        },

        updateDaysExpirationField: function updateDaysExpirationField(event, newValue) {
            if (!newValue) {
                newValue = event.currentTarget.getValue();
            }
            this.props.shareModel.setExpirationFor(this.props.linkData.hash, "days", newValue);
        },

        onDateChange: function onDateChange(event, value) {
            var today = new Date();
            var date1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
            var date2 = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
            var ms = Math.abs(date1 - date2);
            var integerVal = Math.floor(ms / 1000 / 60 / 60 / 24); //floor should be unnecessary, but just in case
            this.updateDaysExpirationField(event, integerVal);
        },

        resetPassword: function resetPassword() {
            this.props.shareModel.resetPassword(this.props.linkData.hash);
        },

        updatePassword: function updatePassword(newValue, oldValue) {
            //var newValue = event.currentTarget.getValue();
            this.props.shareModel.updatePassword(this.props.linkData.hash, newValue);
        },

        renderPasswordContainer: function renderPasswordContainer() {
            var linkId = this.props.linkData.hash;
            var passwordField;
            if (this.props.shareModel.hasHiddenPassword(linkId)) {
                var resetPassword = React.createElement(ReactMUI.FlatButton, {
                    disabled: this.context.isReadonly(),
                    secondary: true,
                    onClick: this.resetPassword,
                    label: this.context.getMessage('174')
                });
                passwordField = React.createElement(ReactMUI.TextField, {
                    floatingLabelText: this.context.getMessage('23'),
                    disabled: true,
                    value: '********',
                    onChange: this.updatePassword
                });
            } else if (!this.context.isReadonly()) {
                passwordField = React.createElement(PydioForm.ValidPassword, {
                    attributes: { label: this.context.getMessage('23') },
                    value: this.props.shareModel.getPassword(linkId),
                    onChange: this.updatePassword
                });
            }
            if (passwordField) {
                return React.createElement(
                    "div",
                    { className: "password-container" },
                    React.createElement(
                        "div",
                        { style: { width: '50%', display: 'inline-block' } },
                        React.createElement("span", { className: "ajxp_icon_span icon-lock" }),
                        passwordField
                    ),
                    React.createElement(
                        "div",
                        { style: { width: '50%', display: 'inline-block' } },
                        resetPassword
                    )
                );
            } else {
                return null;
            }
        },

        formatDate: function formatDate(dateObject) {
            var dateFormatDay = this.context.getMessage('date_format', '').split(' ').shift();
            return dateFormatDay.replace('Y', dateObject.getFullYear()).replace('m', dateObject.getMonth() + 1).replace('d', dateObject.getDate());
        },

        render: function render() {
            var linkId = this.props.linkData.hash;
            var passContainer = this.renderPasswordContainer();
            var crtLinkDLAllowed = this.props.shareModel.getPublicLinkPermission(linkId, 'download');
            var dlLimitValue = this.props.shareModel.getExpirationFor(linkId, 'downloads') === 0 ? "" : this.props.shareModel.getExpirationFor(linkId, 'downloads');
            var expirationDateValue = this.props.shareModel.getExpirationFor(linkId, 'days') === 0 ? "" : this.props.shareModel.getExpirationFor(linkId, 'days');
            var calIcon = React.createElement("span", { className: "ajxp_icon_span icon-calendar" });
            var expDate = null;
            var maxDate = null,
                maxDownloads = null,
                dateExpired = false,
                dlExpired = false;
            var auth = ReactModel.Share.getAuthorizations(this.props.pydio);
            var today = new Date();
            if (parseInt(auth.max_expiration) > 0) {
                maxDate = new Date();
                maxDate.setDate(today.getDate() + parseInt(auth.max_expiration));
            }
            if (parseInt(auth.max_downloads) > 0) {
                // todo: limit the field values by default?
                maxDownloads = parseInt(auth.max_downloads);
            }
            if (expirationDateValue) {
                if (expirationDateValue < 0) {
                    dateExpired = true;
                }
                expDate = new Date();
                expDate.setDate(today.getDate() + parseInt(expirationDateValue));
                var clearValue = (function () {
                    this.props.shareModel.setExpirationFor(linkId, "days", "");
                    this.refs['expirationDate'].getDOMNode().querySelector(".mui-text-field-input").value = "";
                }).bind(this);
                calIcon = React.createElement("span", { className: "ajxp_icon_span mdi mdi-close-circle", onClick: clearValue });
                var calLabel = React.createElement(
                    "span",
                    { className: "calLabelHasValue" },
                    this.context.getMessage(dateExpired ? '21b' : '21')
                );
            }
            if (dlLimitValue) {
                var dlCounter = this.props.shareModel.getDownloadCounter(linkId);
                var resetDl = (function () {
                    if (window.confirm(this.context.getMessage('106'))) {
                        this.props.shareModel.resetDownloadCounter(linkId, function () {});
                    }
                }).bind(this);
                if (dlCounter) {
                    var resetLink = React.createElement(
                        "a",
                        { style: { cursor: 'pointer' }, onClick: resetDl, title: this.context.getMessage('17') },
                        "(",
                        this.context.getMessage('16'),
                        ")"
                    );
                    if (dlCounter >= dlLimitValue) {
                        dlExpired = true;
                    }
                }
                var dlCounterString = React.createElement(
                    "span",
                    { className: "dlCounterString" },
                    dlCounter + '/' + dlLimitValue,
                    " ",
                    resetLink
                );
            }
            return React.createElement(
                "div",
                null,
                React.createElement(
                    "h3",
                    { style: { paddingTop: 0 } },
                    this.context.getMessage('196')
                ),
                React.createElement(
                    "div",
                    { className: "section-legend" },
                    this.context.getMessage('24')
                ),
                passContainer,
                React.createElement(
                    "div",
                    { className: "expires" },
                    React.createElement(
                        "div",
                        { style: { width: '50%', display: 'inline-block', position: 'relative' }, className: dateExpired ? 'limit-block-expired' : null },
                        calIcon,
                        calLabel,
                        React.createElement(ReactMUI.DatePicker, {
                            ref: "expirationDate",
                            disabled: this.context.isReadonly(),
                            onChange: this.onDateChange,
                            key: "start",
                            hintText: this.context.getMessage(dateExpired ? '21b' : '21'),
                            autoOk: true,
                            minDate: new Date(),
                            maxDate: maxDate,
                            defaultDate: expDate,
                            showYearSelector: true,
                            onShow: null,
                            onDismiss: null,
                            formatDate: this.formatDate
                        })
                    ),
                    React.createElement(
                        "div",
                        { style: { width: '50%', display: crtLinkDLAllowed ? 'inline-block' : 'none', position: 'relative' }, className: dlExpired ? 'limit-block-expired' : null },
                        React.createElement("span", { className: "ajxp_icon_span mdi mdi-download" }),
                        React.createElement(ReactMUI.TextField, {
                            type: "number",
                            disabled: this.context.isReadonly(),
                            floatingLabelText: this.context.getMessage(dlExpired ? '22b' : '22'),
                            value: this.props.shareModel.getExpirationFor(linkId, 'downloads') === 0 ? "" : this.props.shareModel.getExpirationFor(linkId, 'downloads'),
                            onChange: this.updateDLExpirationField
                        }),
                        dlCounterString
                    )
                )
            );
        }
    });

    /**************************/
    /* ADVANCED PANEL
    /**************************/
    var AdvancedPanel = React.createClass({
        displayName: "AdvancedPanel",

        propTypes: {
            pydio: React.PropTypes.instanceOf(Pydio),
            shareModel: React.PropTypes.instanceOf(ReactModel.Share)
        },
        render: function render() {

            var layoutData = ReactModel.Share.compileLayoutData(this.props.pydio, this.props.shareModel.getNode());
            if (!this.props.shareModel.getNode().isLeaf() && layoutData.length > 1 && this.props.shareModel.hasPublicLink()) {
                var layoutPane = React.createElement(PublicLinkTemplate, _extends({}, this.props, { linkData: this.props.shareModel.getPublicLinks()[0], layoutData: layoutData }));
            }
            if (!this.props.shareModel.currentRepoIsUserScope()) {
                var visibilityPanel = React.createElement(VisibilityPanel, this.props);
            }
            return React.createElement(
                "div",
                { style: { padding: 16 } },
                React.createElement(LabelDescriptionPanel, this.props),
                React.createElement(NotificationPanel, this.props),
                layoutPane,
                visibilityPanel
            );
        }
    });

    var LabelDescriptionPanel = React.createClass({
        displayName: "LabelDescriptionPanel",

        mixins: [ContextConsumerMixin],

        updateLabel: function updateLabel(event) {
            this.props.shareModel.setGlobal("label", event.currentTarget.value);
        },

        updateDescription: function updateDescription(event) {
            this.props.shareModel.setGlobal("description", event.currentTarget.value);
        },

        render: function render() {
            if (!this.props.shareModel.getNode().isLeaf()) {
                var label = React.createElement(ReactMUI.TextField, {
                    disabled: this.context.isReadonly(),
                    floatingLabelText: this.context.getMessage('35'),
                    name: "label",
                    onChange: this.updateLabel,
                    value: this.props.shareModel.getGlobal('label')
                });
                var labelLegend = React.createElement(
                    "div",
                    { className: "form-legend" },
                    this.context.getMessage('146')
                );
            }
            return React.createElement(
                "div",
                { className: "reset-pydio-forms" },
                React.createElement(
                    "h3",
                    { style: { paddingTop: 0 } },
                    this.context.getMessage('145')
                ),
                React.createElement(
                    "div",
                    { className: "label-desc-edit" },
                    label,
                    labelLegend,
                    React.createElement(ReactMUI.TextField, {
                        disabled: this.context.isReadonly(),
                        floatingLabelText: this.context.getMessage('145'),
                        name: "description",
                        onChange: this.updateDescription,
                        value: this.props.shareModel.getGlobal('description')
                    }),
                    React.createElement(
                        "div",
                        { className: "form-legend" },
                        this.context.getMessage('197')
                    )
                )
            );
        }
    });

    var NotificationPanel = React.createClass({
        displayName: "NotificationPanel",

        mixins: [ContextConsumerMixin],

        dropDownChange: function dropDownChange(event, index, item) {
            this.props.shareModel.setGlobal('watch', index != 0);
        },

        render: function render() {
            var menuItems = [{ payload: 'no_watch', text: this.context.getMessage('187') }, { payload: 'watch_read', text: this.context.getMessage('184') }
            /*,{payload:'watch_write', text:'Notify me when share is modified'}*/
            ];
            var selectedIndex = this.props.shareModel.getGlobal('watch') ? 1 : 0;
            var element;
            if (this.context.isReadonly()) {
                element = React.createElement(ReactMUI.TextField, { disabled: true, value: menuItems[selectedIndex].text, style: { width: '100%' } });
            } else {
                element = React.createElement(ReactMUI.DropDownMenu, {
                    autoWidth: false,
                    className: "full-width",
                    menuItems: menuItems,
                    selectedIndex: selectedIndex,
                    onChange: this.dropDownChange
                });
            }
            return React.createElement(
                "div",
                { className: "reset-pydio-forms" },
                React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('218')
                ),
                element,
                React.createElement(
                    "div",
                    { className: "form-legend" },
                    this.context.getMessage('188')
                )
            );
        }
    });

    var PublicLinkTemplate = React.createClass({
        displayName: "PublicLinkTemplate",

        mixins: [ContextConsumerMixin],

        propTypes: {
            linkData: React.PropTypes.object
        },

        onDropDownChange: function onDropDownChange(event, index, item) {
            this.props.shareModel.setTemplate(this.props.linkData.hash, item.payload);
        },

        render: function render() {
            var index = 0,
                crtIndex = 0;
            var selected = this.props.shareModel.getTemplate(this.props.linkData.hash);
            var menuItems = this.props.layoutData.map(function (l) {
                if (selected && l.LAYOUT_ELEMENT == selected) {
                    crtIndex = index;
                }
                index++;
                return { payload: l.LAYOUT_ELEMENT, text: l.LAYOUT_LABEL };
            });
            var element;
            if (this.context.isReadonly()) {
                element = React.createElement(ReactMUI.TextField, { disabled: true, value: menuItems[crtIndex].text, style: { width: '100%' } });
            } else {
                element = React.createElement(ReactMUI.DropDownMenu, {
                    autoWidth: false,
                    className: "full-width",
                    menuItems: menuItems,
                    selectedIndex: crtIndex,
                    onChange: this.onDropDownChange
                });
            }
            return React.createElement(
                "div",
                { className: "reset-pydio-forms" },
                React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('151')
                ),
                element,
                React.createElement(
                    "div",
                    { className: "form-legend" },
                    this.context.getMessage('198')
                )
            );
        }
    });

    var VisibilityPanel = React.createClass({
        displayName: "VisibilityPanel",

        mixins: [ContextConsumerMixin],

        toggleVisibility: function toggleVisibility() {
            this.props.shareModel.toggleVisibility();
        },
        transferOwnership: function transferOwnership() {
            this.props.shareModel.setNewShareOwner(this.refs['newOwner'].getValue());
        },
        render: function render() {
            var currentIsOwner = this.props.shareModel.currentIsOwner();

            var legend;
            if (this.props.shareModel.isPublic()) {
                if (currentIsOwner) {
                    legend = this.context.getMessage('201');
                } else {
                    legend = this.context.getMessage('202');
                }
            } else {
                legend = this.context.getMessage('206');
            }
            var showToggle = React.createElement(
                "div",
                null,
                React.createElement(ReactMUI.Checkbox, { type: "checkbox",
                    name: "share_visibility",
                    disabled: !currentIsOwner || this.context.isReadonly(),
                    onCheck: this.toggleVisibility,
                    checked: this.props.shareModel.isPublic(),
                    label: this.context.getMessage('200')
                }),
                React.createElement(
                    "div",
                    { className: "section-legend" },
                    legend
                )
            );
            if (this.props.shareModel.isPublic() && currentIsOwner && !this.context.isReadonly()) {
                var showTransfer = React.createElement(
                    "div",
                    { className: "ownership-form" },
                    React.createElement(
                        "h4",
                        null,
                        this.context.getMessage('203')
                    ),
                    React.createElement(
                        "div",
                        { className: "section-legend" },
                        this.context.getMessage('204')
                    ),
                    React.createElement(
                        "div",
                        null,
                        React.createElement(ReactMUI.TextField, { ref: "newOwner", floatingLabelText: this.context.getMessage('205') }),
                        React.createElement(ReactMUI.RaisedButton, { label: this.context.getMessage('203b'), onClick: this.transferOwnership })
                    )
                );
            }
            return React.createElement(
                "div",
                { className: "reset-pydio-forms ie_material_checkbox_fix" },
                React.createElement(
                    "h3",
                    null,
                    this.context.getMessage('199')
                ),
                showToggle,
                showTransfer
            );
        }
    });

    var DialogNamespace = global.ShareDialog || {};
    DialogNamespace.MainPanel = MainPanel;
    global.ShareDialog = DialogNamespace;
})(window);
