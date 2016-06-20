'use strict';

var _get = function get(_x5, _x6, _x7) { var _again = true; _function: while (_again) { var object = _x5, property = _x6, receiver = _x7; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x5 = parent; _x6 = property; _x7 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (global) {
    var Task = (function () {
        function Task(data) {
            _classCallCheck(this, Task);

            this._internal = data;
        }

        _createClass(Task, [{
            key: 'getId',
            value: function getId() {
                return this._internal['id'];
            }
        }, {
            key: 'isStoppable',
            value: function isStoppable() {
                return this._internal['flags'] & Task.FLAG_STOPPABLE;
            }
        }, {
            key: 'isResumable',
            value: function isResumable() {
                return this._internal['flags'] & Task.FLAG_RESUMABLE;
            }
        }, {
            key: 'hasProgress',
            value: function hasProgress() {
                return this._internal['flags'] & Task.FLAG_HAS_PROGRESS;
            }
        }, {
            key: 'getProgress',
            value: function getProgress() {
                return this._internal['progress'];
            }
        }, {
            key: 'getLabel',
            value: function getLabel() {
                return this._internal['label'];
            }
        }, {
            key: 'getStatus',
            value: function getStatus() {
                return this._internal['status'];
            }
        }, {
            key: 'getStatusMessage',
            value: function getStatusMessage() {
                return this._internal['statusMessage'];
            }
        }, {
            key: 'getData',
            value: function getData() {
                return this._internal;
            }
        }, {
            key: 'pause',
            value: function pause() {
                TaskAPI.updateTaskStatus(this, Task.STATUS_PAUSED);
            }
        }, {
            key: 'stop',
            value: function stop() {
                TaskAPI.updateTaskStatus(this, Task.STATUS_COMPLETE);
            }
        }]);

        return Task;
    })();

    Task.STATUS_PENDING = 1;
    Task.STATUS_RUNNING = 2;
    Task.STATUS_COMPLETE = 4;
    Task.STATUS_FAILED = 8;
    Task.STATUS_PAUSED = 16;

    Task.FLAG_STOPPABLE = 1;
    Task.FLAG_RESUMABLE = 2;
    Task.FLAG_HAS_PROGRESS = 4;

    var TaskAPI = (function () {
        function TaskAPI() {
            _classCallCheck(this, TaskAPI);
        }

        _createClass(TaskAPI, null, [{
            key: 'createTask',
            value: function createTask(task) {
                PydioApi.getClient().request({
                    "get_action": "task_create",
                    "task": JSON.stringify(task.getData())
                });
            }
        }, {
            key: 'loadTasks',
            value: function loadTasks(callback) {
                PydioApi.getClient().request({
                    "get_action": "tasks_list"
                }, (function (transport) {
                    if (transport.responseJSON) {
                        var tasks = transport.responseJSON.map(function (taskData) {
                            return new Task(taskData);
                        });
                        callback(tasks);
                    }
                }).bind(this));
            }
        }, {
            key: 'updateTaskStatus',
            value: function updateTaskStatus(task, status) {
                PydioApi.getClient().request({
                    "get_action": "task_toggle_status",
                    "taskId": task.getData()['id'],
                    "status": status
                });
            }
        }]);

        return TaskAPI;
    })();

    var STORE_INSTANCE = null;

    var TaskStore = (function (_Observable) {
        _inherits(TaskStore, _Observable);

        _createClass(TaskStore, null, [{
            key: 'getInstance',
            value: function getInstance() {
                if (!STORE_INSTANCE) STORE_INSTANCE = new TaskStore();
                return STORE_INSTANCE;
            }
        }]);

        function TaskStore() {
            _classCallCheck(this, TaskStore);

            _get(Object.getPrototypeOf(TaskStore.prototype), 'constructor', this).call(this);
            // Start listening to server messages
            global.pydio.observe("server_message", (function (xml) {
                var _this = this;

                var task = XMLUtils.XPathSelectSingleNode(xml, 'tree/task');
                if (task) {
                    var data = task.getAttribute("data");
                    var t = JSON.parse(data);
                    if (t instanceof Object && t.id) {
                        var taskObject = new Task(t);
                        this._tasksList.set(t.id, taskObject);
                        this.notify("tasks_updated", taskObject);
                        global.pydio.notify("poller.frequency", { value: 2 });
                    }
                }
                var taskList = XMLUtils.XPathSelectSingleNode(xml, 'tree/taskList');
                if (taskList) {
                    var jsonData = taskList.firstChild.nodeValue; // CDATA
                    var tasks = JSON.parse(jsonData);
                    if (tasks instanceof Object) {
                        (function () {
                            var taskMap = new Map();
                            tasks.map(function (t) {
                                var task = new Task(t);
                                taskMap.set(task.getId(), task);
                            });
                            _this._tasksList = taskMap;
                            _this.notify("tasks_updated");
                            if (tasks.length) {
                                global.pydio.notify("poller.frequency", { value: 2 });
                            } else {
                                global.pydio.notify("poller.frequency", {});
                            }
                        })();
                    }
                }
            }).bind(this));

            global.pydio.observe("registry_loaded", (function () {

                this.getTasks(true);
            }).bind(this));
        }

        _createClass(TaskStore, [{
            key: 'getTasks',
            value: function getTasks() {
                var forceRefresh = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

                if (this._tasksList == undefined || forceRefresh) {
                    this._tasksList = new Map();
                    TaskAPI.loadTasks((function (tasks) {
                        var taskMap = new Map();
                        tasks.map(function (t) {
                            taskMap.set(t.getId(), t);
                        });
                        this._tasksList = taskMap;
                        this.notify("tasks_updated");
                        if (tasks.length) {
                            global.pydio.notify("poller.frequency", { value: 2 });
                        } else {
                            global.pydio.notify("poller.frequency", {});
                        }
                    }).bind(this));
                }
                return this._tasksList;
            }
        }], [{
            key: 'enqueueActionTask',
            value: function enqueueActionTask(label, action) {
                var parameters = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
                var nodes = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];
                var flags = arguments.length <= 4 || arguments[4] === undefined ? Task.FLAG_STOPPABLE : arguments[4];

                var task = {
                    label: label,
                    flags: flags,
                    status: 1,
                    statusMessage: '',
                    action: action,
                    parameters: parameters,
                    nodes: nodes
                };
                TaskAPI.createTask(new Task(task));
            }
        }]);

        return TaskStore;
    })(Observable);

    var TaskAction = React.createClass({
        displayName: 'TaskAction',

        getInitialState: function getInitialState() {
            return { showProgress: true };
        },

        showAction: function showAction() {
            this.setState({ showProgress: false });
        },

        showProgress: function showProgress() {
            this.setState({ showProgress: true });
        },

        render: function render() {
            var t = this.props.task;

            var actions = undefined;
            if (t.getStatus() == Task.STATUS_RUNNING) {
                if (t.isStoppable()) {
                    actions = React.createElement('span', { className: 'icon-stop', onClick: t.pause.bind(t) });
                }
            } else {
                actions = React.createElement('span', { className: 'mdi mdi-close-circle-outline', onClick: t.stop.bind(t) });
            }
            if (this.state.showProgress && t.hasProgress()) {
                actions = React.createElement(
                    'div',
                    { className: 'radial-progress' },
                    React.createElement('div', { className: "pie-wrapper pie-wrapper--solid progress-" + t.getProgress() })
                );
            }
            return React.createElement(
                'div',
                { className: 'task_actions', onMouseOver: this.showAction, onMouseOut: this.showProgress },
                actions
            );
        }

    });

    var TaskEntry = React.createClass({
        displayName: 'TaskEntry',

        render: function render() {
            var t = this.props.task;
            var actions = undefined;
            if (t.getStatus() == Task.STATUS_RUNNING) {
                if (t.isStoppable()) {
                    actions = React.createElement('span', { className: 'icon-stop', onClick: t.pause.bind(t) });
                }
            } else {
                actions = React.createElement('span', { className: 'mdi mdi-close-circle-outline', onClick: t.stop.bind(t) });
            }
            if (t.hasProgress()) {
                actions = React.createElement(
                    'div',
                    { className: 'radial-progress' },
                    React.createElement('div', { className: "pie-wrapper pie-wrapper--solid progress-" + t.getProgress() })
                );
            }
            return React.createElement(
                'div',
                { className: 'task' },
                React.createElement(
                    'div',
                    { className: 'task_texts' },
                    React.createElement(
                        'div',
                        { className: 'task_label' },
                        t.getLabel()
                    ),
                    React.createElement(
                        'div',
                        { className: 'status_message', title: t.getStatusMessage() },
                        t.getStatusMessage()
                    )
                ),
                React.createElement(TaskAction, { task: t })
            );
        }
    });

    var TasksPanel = React.createClass({
        displayName: 'TasksPanel',

        refreshTasks: function refreshTasks() {
            if (!this.isMounted()) {
                return;
            }
            this.setState({
                tasks: TaskStore.getInstance().getTasks()
            });
        },

        getInitialState: function getInitialState() {
            return {
                tasks: TaskStore.getInstance().getTasks()
            };
        },

        componentDidMount: function componentDidMount() {
            TaskStore.getInstance().observe("tasks_updated", this.refreshTasks.bind(this));
        },

        componentWillUnmount: function componentWillUnmount() {
            TaskStore.getInstance().stopObserving("tasks_updated");
        },

        render: function render() {
            var tasks = [];
            this.state.tasks.forEach(function (t) {
                if (t.getStatus() == Task.STATUS_COMPLETE) return;
                tasks.push(React.createElement(TaskEntry, { task: t }));
            });
            var className = "pydio-tasks-panel";
            var heightStyle = undefined;
            if (!tasks.length) {
                className += " invisible";
            } else {
                heightStyle = { height: Math.min(tasks.length * 60, 180) };
            }
            return React.createElement(
                'div',
                { className: className, style: heightStyle },
                tasks
            );
        }
    });

    // Export TaskStore
    var ns = global.PydioTasks || {};
    ns.Store = TaskStore;
    ns.Task = Task;
    ns.Panel = TasksPanel;
    global.PydioTasks = ns;
})(window);
