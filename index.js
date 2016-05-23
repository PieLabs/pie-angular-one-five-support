(function (pie) {

  var el = angular.element;

  function loadScope(element) {
    return el(element).isolateScope() || el(element).scope();
  }

  function setNgProperty(scope, key, data) {
    scope[key] = data;
    scope.$digest();
  }

  function configureNgModule($provide) {

    var element = this;
    /**
     * Decorate the rootScope so that we can propogate $emits from the directive scope,
     * out of the angular context (needed to support legacy components).
     */
    function decorateRootScope($log, $delegate) {

      var scopePrototype = ('getPrototypeOf' in Object) ?
        Object.getPrototypeOf($delegate) : $delegate.__proto__; //jshint ignore:line

      var _new = scopePrototype.$new;
      scopePrototype.$new = function () {
        var child = _new.apply(this, arguments);
        var _emit = child.$emit;
        child.$emit = function () {

          //if the scope is the ui-components scope - send the events out of ng
          if (loadScope(element) === this) {
            var eventType = Array.prototype.shift.call(arguments);
            var args = Array.prototype.slice.call(arguments);
            console.log('custom $emit - eventType: ', eventType);
            var event = new CustomEvent(eventType, { bubbles: true, detail: args });
            element.dispatchEvent(event);
          } else {
            _emit.apply(this, arguments);
          }
        };
        return child;
      };

      return $delegate;
    }

    $provide.decorator('$rootScope', ['$log', '$delegate', decorateRootScope]);
  }

  pie.addFramework('angular', {
    definePrototype: function (name, moduleName) {

      moduleName = moduleName || name;

      var elementPrototype = Object.create(HTMLElement.prototype);

      elementPrototype.angularModuleName = moduleName;
       
       
      function defineProperty(name){
        var key = '__' + name;
        Object.defineProperty(elementPrototype, name, {
          get: function () {
            return this[key];
          },
          set: function (d) {
            this[key] = d;
            if (this.__scope) {
              setNgProperty(this.__scope, name, this[key]);
            }
          }
        });
      }
      
      defineProperty('env');
      defineProperty('question');
      defineProperty('session');
      defineProperty('outcome');

      function create() {
        angular.module(this.angularModuleName)
          .config(['$provide', configureNgModule.bind(this)]);


        angular.bootstrap(this, [this.angularModuleName]);
        this.__scope = loadScope(this);

        if (this.__question) {
          setNgProperty(this.__scope, 'question', this.__question);
        }

        if (this.__session) {
          setNgProperty(this.__scope, 'session', this.__session);
        }

        if (this.__env) {
          setNgProperty(this.__scope, 'env', this.__env);
        }
      }

      elementPrototype.createdCallback = function () {
        console.log('created!', this, arguments);
        create.bind(this)();
      };
      
      return elementPrototype;

    }
  });

})(pie);
