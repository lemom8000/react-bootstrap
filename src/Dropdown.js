import classNames from 'classnames';
import activeElement from 'dom-helpers/activeElement';
import contains from 'dom-helpers/query/contains';
import keycode from 'keycode';
import find from 'lodash-compat/collection/find';
import omit from 'lodash-compat/object/omit';
import React, { cloneElement } from 'react';
import ReactDOM from 'react-dom';
import all from 'react-prop-types/lib/all';
import elementType from 'react-prop-types/lib/elementType';
import isRequiredForA11y from 'react-prop-types/lib/isRequiredForA11y';
import uncontrollable from 'uncontrollable';
import warning from 'warning';

import { prefix } from './utils/bootstrapUtils';
import createChainedFunction from './utils/createChainedFunction';
import CustomPropTypes from './utils/CustomPropTypes';
import ValidComponentChildren from './utils/ValidComponentChildren';

import ButtonGroup from './ButtonGroup';
import DropdownMenu from './DropdownMenu';
import DropdownToggle from './DropdownToggle';

const TOGGLE_ROLE = DropdownToggle.defaultProps.bsRole;
const MENU_ROLE = DropdownMenu.defaultProps.bsRole;

class Dropdown extends React.Component {

  constructor(props) {
    super(props);

    this.Toggle = DropdownToggle;

    this.toggleOpen = this.toggleOpen.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.extractChildren = this.extractChildren.bind(this);

    this.refineMenu = this.refineMenu.bind(this);
    this.refineToggle = this.refineToggle.bind(this);

    this.childExtractors = [{
      key: 'toggle',
      matches: child => child.props.bsRole === TOGGLE_ROLE,
      refine: this.refineToggle
    }, {
      key: 'menu',
      exclusive: true,
      matches: child => child.props.bsRole === MENU_ROLE,
      refine: this.refineMenu
    }];

    this.state = {};

    this.lastOpenEventType = null;
  }

  componentDidMount() {
    this.focusNextOnOpen();
  }

  componentWillUpdate(nextProps) {
    if (!nextProps.open && this.props.open) {
      this._focusInDropdown = contains(
        ReactDOM.findDOMNode(this.menu),
        activeElement(document)
      );
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.open && !prevProps.open) {
      this.focusNextOnOpen();
    }

    if (!this.props.open && prevProps.open) {
      // if focus hasn't already moved from the menu lets return it
      // to the toggle
      if (this._focusInDropdown) {
        this._focusInDropdown = false;
        this.focus();
      }
    }
  }

  render() {
    let children = this.extractChildren();
    let Component = this.props.componentClass;

    let props = omit(this.props, ['id', 'bsClass', 'role', 'onSelect']);
    let className = prefix(this.props);

    const rootClasses = {
      open: this.props.open,
      disabled: this.props.disabled,
      [className]: !this.props.dropup,
      dropup: this.props.dropup
    };

    return (
      <Component
        {...props}
        className={classNames(this.props.className, rootClasses)}
      >
        { children }
      </Component>
    );
  }

  toggleOpen(eventType = null) {
    let open = !this.props.open;

    if (open) {
      this.lastOpenEventType = eventType;
    }

    if (this.props.onToggle) {
      this.props.onToggle(open);
    }
  }

  handleClick() {
    if (this.props.disabled) {
      return;
    }

    this.toggleOpen('click');
  }

  handleKeyDown(event) {
    if (this.props.disabled) {
      return;
    }

    switch (event.keyCode) {
    case keycode.codes.down:
      if (!this.props.open) {
        this.toggleOpen('keydown');
      } else if (this.menu.focusNext) {
        this.menu.focusNext();
      }
      event.preventDefault();
      break;
    case keycode.codes.esc:
    case keycode.codes.tab:
      this.handleClose(event);
      break;
    default:
    }
  }

  handleClose() {
    if (!this.props.open) {
      return;
    }

    this.toggleOpen();
  }

  focusNextOnOpen() {
    const menu = this.menu;

    if (!menu.focusNext) {
      return;
    }

    if (
      this.lastOpenEventType === 'keydown' ||
      this.props.role === 'menuitem'
    ) {
      menu.focusNext();
    }
  }

  focus() {
    let toggle = ReactDOM.findDOMNode(this.toggle);

    if (toggle && toggle.focus) {
      toggle.focus();
    }
  }

  extractChildren() {
    let open = !!this.props.open;
    let seen = {};

    return ValidComponentChildren.map(this.props.children, child => {
      let extractor = find(this.childExtractors, x => x.matches(child));

      if (extractor) {
        if (seen[extractor.key]) {
          return false;
        }

        seen[extractor.key] = extractor.exclusive;
        child = extractor.refine(child, open);
      }

      return child;
    });
  }

  refineMenu(menu, open) {
    let ref = r => this.menu = r;

    if (typeof menu.ref === 'string') {
      warning(false,
        'String refs are not supported on `<Dropdown.Menu>` components. ' +
        'To apply a ref to the component use the callback signature: \n\n ' +
        'https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute'
      );
    } else {
      ref = createChainedFunction(menu.ref, ref);
    }

    const menuProps = {
      ref,
      open,
      labelledBy: this.props.id,
      pullRight: this.props.pullRight,
      bsClass: this.props.bsClass
    };

    menuProps.onClose = createChainedFunction(
      menu.props.onClose,
      this.props.onClose,
      this.handleClose
    );

    menuProps.onSelect = createChainedFunction(
      menu.props.onSelect,
      this.props.onSelect,
      this.handleClose
    );

    return cloneElement(menu, menuProps, menu.props.children);
  }

  refineToggle(toggle, open) {
    let ref = r => this.toggle = r;

    if (typeof toggle.ref === 'string') {
      warning(false,
        'String refs are not supported on `<Dropdown.Toggle>` components. ' +
        'To apply a ref to the component use the callback signature: \n\n ' +
        'https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute'
      );
    } else {
      ref = createChainedFunction(toggle.ref, ref);
    }

    let toggleProps = {
      ref,
      open,
      id: this.props.id,
      role: this.props.role,
      bsClass: this.props.bsClass
    };

    toggleProps.onClick = createChainedFunction(
      toggle.props.onClick,
      this.handleClick
    );

    toggleProps.onKeyDown = createChainedFunction(
      toggle.props.onKeyDown,
      this.handleKeyDown
    );

    return cloneElement(toggle, toggleProps, toggle.props.children);
  }
}

Dropdown.Toggle = DropdownToggle;

Dropdown.TOGGLE_ROLE = TOGGLE_ROLE;
Dropdown.MENU_ROLE = MENU_ROLE;

Dropdown.defaultProps = {
  componentClass: ButtonGroup,
  bsClass: 'dropdown'
};

Dropdown.propTypes = {

  bsClass: React.PropTypes.string,

  /**
   * The menu will open above the dropdown button, instead of below it.
   */
  dropup: React.PropTypes.bool,

  /**
   * An html id attribute, necessary for assistive technologies, such as screen readers.
   * @type {string|number}
   * @required
   */
  id: isRequiredForA11y(
    React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ])
  ),

  componentClass: elementType,

  /**
   * The children of a Dropdown may be a `<Dropdown.Toggle/>` or a `<Dropdown.Menu/>`.
   * @type {node}
   */
  children: all(
    CustomPropTypes.requiredRoles(TOGGLE_ROLE, MENU_ROLE),
    CustomPropTypes.exclusiveRoles(MENU_ROLE)
  ),

  /**
   * Whether or not component is disabled.
   */
  disabled: React.PropTypes.bool,

  /**
   * Align the menu to the right side of the Dropdown toggle
   */
  pullRight: React.PropTypes.bool,

  /**
   * Whether or not the Dropdown is visible.
   *
   * @controllable onToggle
   */
  open: React.PropTypes.bool,

  /**
   * A callback fired when the Dropdown closes.
   */
  onClose: React.PropTypes.func,

  /**
   * A callback fired when the Dropdown wishes to change visibility. Called with the requested
   * `open` value.
   *
   * ```js
   * function(Boolean isOpen) {}
   * ```
   * @controllable open
   */
  onToggle: React.PropTypes.func,

  /**
   * A callback fired when a menu item is selected.
   *
   * ```js
   * (eventKey: any, event: Object) => any
   * ```
   */
  onSelect: React.PropTypes.func,

  /**
   * If `'menuitem'`, causes the dropdown to behave like a menu item rather than
   * a menu button.
   */
  role: React.PropTypes.string
};

Dropdown = uncontrollable(Dropdown, { open: 'onToggle' });

Dropdown.Toggle = DropdownToggle;
Dropdown.Menu = DropdownMenu;

export default Dropdown;
