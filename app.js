/*global jQuery, Handlebars, Router */
(function () {
	'use strict';
	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile(document.getElementById('todo-template').innerHTML);
		  this.footerTemplate = Handlebars.compile(document.getElementById('footer-template').innerHTML);
			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {
		  var newThis = this;
		  var newtodo = document.getElementById('new-todo');
		  newtodo.addEventListener('keyup', this.create.bind(this));
		  var toggleall = document.getElementById('toggle-all');
		  toggleall.addEventListener('change', this.toggleAll.bind(this));
		  var footer = document.getElementById('footer');
		  // var clearCompleted = document.getElementById('clear-completed');
		  // addEvent(footer, 'click', clearCompleted, this.destroyCompleted());
		  footer.addEventListener('click', function(event) {
		    if (event.target.id === 'clear-completed') {
		      newThis.destroyCompleted();
		    }
		  });

	    var todoList = document.getElementById('todo-list');
	    todoList.addEventListener('change', function(event) {
	      if (event.target.className === 'toggle') {
	        newThis.toggle(event);
	      }
	    });
	    todoList.addEventListener('dblclick', function(event) {
	      if (event.target.tagName === 'LABEL') {
	        newThis.edit(event);
	      }
	    });
	    todoList.addEventListener('keyup', function(event) {
	      if (event.target.className === 'edit') {
	        newThis.editKeyup(event);
	      }
	    });
	    todoList.addEventListener('focusout', function(event) {
	      if (event.target.className === 'edit') {
	        newThis.update(event);
	      }
	    });
	    todoList.addEventListener('click', function(event) {
	      if (event.target.className === 'destroy') {
	        newThis.destroy(event);
	      }
	    });
		},
		render: function () {
		  var newThis = this,
			    todos = this.getFilteredTodos(),
			    shouldBeChecked = newThis.getActiveTodos().length === 0;
			document.getElementById('todo-list').innerHTML = this.todoTemplate(todos);
			if (todos.length > 0) {
			  // This might supposed to be something else, but I'm too lazy to check to change it
			  document.getElementById('main').style.display = 'block';
			} else {
			  document.getElementById('main').style.display = 'none';
			}
			if (shouldBeChecked) {
			  document.getElementById('toggle-all').checked = true;
			} else {
			  document.getElementById('toggle-all').checked = false;
			}
			newThis.renderFooter();
		  document.getElementById('new-todo').focus();
		},
		store: function () {
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter ? this.filter : 'all'
			});
			if (todoCount > 0) {
			  document.getElementById('footer').style.display = 'block';
			} else {
			  document.getElementById('footer').style.display = 'none';
			}
      document.getElementById('footer').innerHTML = template;
		},
		toggleAll: function (e) {
			var isChecked = e.target.checked;

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
			this.store();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
			this.store();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) {
			var id = el.closest('li').dataset.id;
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var input = e.target;
			var val = input.value.trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			input.value = '';

			this.render();
			this.store();
		},
		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
			this.store();
		},
		edit: function (e) {
			var li = e.target.closest('li'),
			    children = li.children,
			    input;
			li.className = 'editing';
			for (var i = 0; i < children.length; i++) {
			  if (children[i].className === 'edit') {
			     input = children[i];
			  }
			}
			input.focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				e.target.abort = true;
				e.target.blur();
			}
		},
		update: function (e) {
			var el = e.target;
			var val = el.value.trim();

			if (!val) {
				this.destroy(e);
				return;
			}

			if (el.abort === true) {
				el.abort = false;
			} else {
				this.todos[this.indexFromEl(el)].title = val;
			}

			this.render();
			this.store();
		},
		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1);
			this.render();
			this.store();
		}
	};

	App.init();


})();
