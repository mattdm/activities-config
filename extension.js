/* -*- mode: js2 - indent-tabs-mode: nil - js2-basic-offset: 4 -*- */
/* This extension is a derived work of the Gnome Shell.
*
* Copyright (c) 2012-2014 Norman L. Smith
*
* This extension is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This extension is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this extension; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
*/
const Cairo = imports.cairo;
const Atk = imports.gi.Atk;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const DND = imports.ui.dnd;
const Layout = imports.ui.layout;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain('nls1729-extensions');
const _ = Gettext.gettext;
const _N = function(x) { return x; };

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Colors = Me.imports.colors;
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;
const Notify = Me.imports.notify;
const Readme = Me.imports.readme;
const CONFLICT = 'Conflict Detected:';
const MIA_ICON = 'Missing Icon:';
const DEFAULT_ICO = Me.path + Keys.ICON_FILE;
const DISABLE_TOGGLE = 32767;

const ActivitiesIconButton = new Lang.Class({
    Name: 'ActivitiesConfigurator.ActivitiesIconButton',
    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0, null, true);
        this._actorSignals = [];
        this._mainSignals = [];
        this.container.name = 'panelActivitiesIconButtonContainer';
        this.actor.accessible_role = Atk.Role.TOGGLE_BUTTON;
        this.actor.name = 'panelActivitiesIconButton';
        this._iconLabelBox = new St.BoxLayout();
        this._iconBin = new St.Bin();
        this._textBin = new St.Bin();
        this._iconLabelBox.add(this._iconBin);
        this._label = new St.Label();
        this._textBin.child = this._label;
        this._iconLabelBox.add(this._textBin);
        this.actor.add_actor(this._iconLabelBox);
        this.actor.label_actor = this._label;
        let sig;
        this._actorSignals.push(sig = this.actor.connect('captured-event', Lang.bind(this, this._onCapturedEvent)));
        this._actorSignals.push(sig = this.actor.connect_after('button-release-event', Lang.bind(this, this._onButtonRelease)));
        this._actorSignals.push(sig = this.actor.connect_after('key-release-event', Lang.bind(this, this._onKeyRelease)));
        this._mainSignals.push(sig = Main.overview.connect('showing', Lang.bind(this, function() {
            this.actor.add_style_pseudo_class('overview');
            this.actor.add_accessible_state (Atk.StateType.CHECKED);
        })));
        this._mainSignals.push(sig = Main.overview.connect('hiding', Lang.bind(this, function() {
            this.actor.remove_style_pseudo_class('overview');
            this.actor.remove_accessible_state (Atk.StateType.CHECKED);
        })));
        this._xdndTimeOut = 0;

        // Good until major version 4 ;)
        this._prefsCommand = 'gnome-shell-extension-prefs';
        let minor = parseInt(Config.PACKAGE_VERSION.split('.')[1]);
        if (minor < 14)
            this._prefsCommand =  this._prefsCommand + ' ' + Me.metadata.uuid;
    },

    handleDragOver: function(source, actor, x, y, time) {
        if (source != Main.xdndHandler)
            return DND.DragMotionResult.CONTINUE;
        if (this._xdndTimeOut != 0)
            Mainloop.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = Mainloop.timeout_add(BUTTON_DND_ACTIVATION_TIMEOUT,
                                                 Lang.bind(this, this._xdndToggleOverview, actor));
        return DND.DragMotionResult.CONTINUE;
    },

    _onCapturedEvent: function(actor, event) {
        if (event.type() == Clutter.EventType.BUTTON_PRESS) {
            if (event.get_button() == 3) {
                Main.Util.trySpawnCommandLine(this._prefsCommand);
                return true;
            }
            if (!Main.overview.shouldToggleByCornerOrButton())
                return true;
        }
        return false;
    },

    _onButtonRelease: function(actor, event) {
        if (event.get_button() != 3)
            Main.overview.toggle();
    },

    _onKeyRelease: function(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return || symbol == Clutter.KEY_space) {
            Main.overview.toggle();
        }
    },

    _xdndToggleOverview: function(actor) {
        let [x, y, mask] = global.get_pointer();
        let pickedActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
        if (pickedActor == this.actor && Main.overview.shouldToggleByCornerOrButton())
            Main.overview.toggle();
        Mainloop.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = 0;
    },

    destroy: function() {
        if (this._xdndTimeOut != 0)
            Mainloop.source_remove(this._xdndTimeOut);
        while(this._actorSignals.length > 0) {
	    this.actor.disconnect(this._actorSignals.pop());
        }
        while(this._mainSignals.length > 0) {
	    Main.overview.disconnect(this._mainSignals.pop());
        }
        this.parent();
    }

});

const Configurator = new Lang.Class({
    Name: 'ActivitiesConfigurator.Configurator',

    _init : function() {
        this._enabled = false;
        this._settings = Convenience.getSettings();
        this._firstEnable = this._settings.get_boolean(Keys.FIRST_ENABLE);
        if(this._firstEnable)
            this._settings.set_string(Keys.NEW_ICO, DEFAULT_ICO);
        this._savedBarrierThreshold = Main.layoutManager.hotCorners[Main.layoutManager.primaryIndex]._pressureBarrier._threshold;
        this._barriersSupported = global.display.supports_extended_barriers();
        this._setBarriersSupport(this._barriersSupported);
        this._savedText = this._settings.get_string(Keys.ORI_TXT);
        this._iconPath = '';
        this._checkConflictSignal = null;
        this._conflictCount = 0;
        this._timeoutId = 0;
        this._conflictDetection = false;
        this._panelColor = Colors.getColorRGB(this._settings.get_string(Keys.COLOURS));
        this._panelOpacity = (100 - this._settings.get_int(Keys.TRS_PAN)) / 100;
        this._roundedCornersHidden = false;
        this._transparencySig = null;
        this._signalIdLC = null;
        this._signalIdRC = null;
        this._activitiesIndicator = null;
        this._signalShow = null;
        this._hotCornerThreshold = 0;
        this._signalHotCornersChanged = null;
        this._maximizeId = null;
        this._unmaximizeId = null;
        this._restackedId = null;
    },

    _disconnectGlobalSignals: function() {
        if(this._maximizeId != null) {
            global.window_manager.disconnect(this._maximizeId);
            this._maximizeId = null;
        }
        if(this._unmaximizeId != null) {
            global.window_manager.disconnect(this._unmaximizeId);
            this._unmaximizeId = null;
        }
        if(this._restackedId != null) {
            global.screen.disconnect(this._restackedId);
            this._restackedId = null;
        }
    },

    _maxWindowPanelEffect: function() {
        this._maxOnPrimary = false;
        this._actionNeeded1 = true;
        this._actionNeeded2 = true;
        this._panelTransparentState = true;
        this._workspace = null;
        this._maxWinEffect = this._settings.get_int(Keys.MAX_WIN_EFFECT);
        if(this._maxWinEffect > 0) {
            this._maxUnmax();
            if(this._maximizeId == null)
                this._maximizeId = global.window_manager.connect('maximize', Lang.bind(this, this._maxUnmax));
            if(this._unmaximizeId == null)
                this._unmaximizeId = global.window_manager.connect('unmaximize',Lang.bind(this, this._maxUnmax));
            if(this._restackedId == null)
                this._restackedId = global.screen.connect('restacked', Lang.bind(this, this._maxUnmax));
        } else {
            this._disconnectGlobalSignals();
            this._setPanelBackground();
        }
    },

    _maxUnmax: function() {
        let currentWindow;
        this._maxOnPrimary = false;
        let primaryMonitor = global.screen.get_primary_monitor();
        let workspace = global.screen.get_active_workspace();
        if(this._workspace != workspace) {
            this._actionNeeded1 = true;
            this._actionNeeded2 = true;
            this._workspace = workspace;
        }
        let windows = workspace.list_windows();
        for (let i = 0; i < windows.length; ++i) {
            currentWindow = windows[i];
            if(currentWindow.get_monitor() != primaryMonitor)
                continue;
            if(currentWindow.maximized_horizontally &&  currentWindow.maximized_vertically && !currentWindow.is_hidden()) {
                this._maxOnPrimary = true;
                break;
            }
        }
        if(this._maxOnPrimary && this._actionNeeded1) {
            this._actionNeeded1 = false;
            this._actionNeeded2 = true;
            if(this._panelTransparentState) {
                this._setPanelBackground(true);
                this._panelTransparentState = false;
            }
        } else if(!this._maxOnPrimary && this._actionNeeded2) {
            this._actionNeeded1 = true;
            this._actionNeeded2 = false;
            if(!this._panelTransparentState) {
                this._setPanelBackground(false);
                this._panelTransparentState = true;
            }
        }
    },

    _setBarriersSupport: function(value) {
        this._settings.set_boolean(Keys.BARRIERS, value);
        if(value)
            this._hotKey = Keys.HOTC_PT; // Toggle Barrier Pressue Threshold
        else
            this._hotKey = Keys.HOTC_TO; // Toggle Delay Time Out
    },

    _connectSettings: function() {
        this._settingsSignals = [];
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.MAX_WIN_EFFECT, Lang.bind(this, this._maxWindowPanelEffect)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.REMOVED, Lang.bind(this, this._setActivities)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NEW_TXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NEW_ICO, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+this._hotKey, Lang.bind(this, this._setHotCornerThreshold)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_HOTC, Lang.bind(this, this._setHotCorner)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_TEXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.NO_ICON, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.PAD_TXT, Lang.bind(this, this._setText)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.PAD_ICO, Lang.bind(this, this._setIcon)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.COLOURS, Lang.bind(this, this._setPanelColor)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.CON_DET, Lang.bind(this, this._setConflictDetection)));
        this._settingsSignals.push(this._settings.connect('changed::'+Keys.HIDE_RC, Lang.bind(this, this._setHiddenCorners)));
        this._transparencySig = this._settings.connect('changed::'+Keys.TRS_PAN, Lang.bind(this, this._setPanelTransparency));
        this._settingsSignals.push(this._transparencySig);
    },

    _handleCornerSignals: function(connect) {
        if(connect) {
            if(this._signalIdLC == null)
                this._signalIdLC = Main.panel._leftCorner.actor.connect('repaint', Lang.bind(this, this._redoLeft));
            if(this._signalIdRC == null)
                this._signalIdRC = Main.panel._rightCorner.actor.connect('repaint', Lang.bind(this, this._redoRight));
        } else {
            if(this._signalIdLC != null) {
                Main.panel._leftCorner.actor.disconnect(this._signalIdLC);
                this._signalIdLC = null;
            }
            if(this._signalIdRC != null) {
                Main.panel._rightCorner.actor.disconnect(this._signalIdRC);
                this._signalIdRC = null;
            }
        }
    },

    _disconnectSignals: function() {
        this._disconnectGlobalSignals();
        if(this._checkConflictSignal != null) {
            Main.panel._leftBox.disconnect(this._checkConflictSignal);
            this._checkConflictSignal = null;
        }
        while(this._settingsSignals.length > 0) {
	    this._settings.disconnect(this._settingsSignals.pop());
        }
        this._handleCornerSignals(false);
        if(this._signalHotCornersChanged != null) {
            Main.layoutManager.disconnect(this._signalHotCornersChanged);
            this._signalHotCornersChanged = null;
        }
    },

    _setIcon: function() {
        let iconPath = this._settings.get_string(Keys.NEW_ICO);
        if(this._iconPath != iconPath) {
            if (!GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                Notify.notifyError(_N(MIA_ICON),Readme.makeTextStr(Readme.ICON_MIA));
                iconPath = DEFAULT_ICO;
                this._settings.set_string(Keys.NEW_ICO, DEFAULT_ICO);
            }
            this._activitiesIconButton._iconBin.child = new St.Icon({ gicon: Gio.icon_new_for_string(iconPath) });
            this._activitiesIconButton._iconBin.child.style_class = 'activities-icon';
            this._iconPath = iconPath;
        }
        if(this._settings.get_boolean(Keys.NO_ICON)) {
            this._activitiesIconButton._iconBin.hide();
        } else {
            let pixels = this._settings.get_int(Keys.PAD_ICO);
            let iconStyle = 'icon-size: 1.5em; padding-left: %dpx; padding-right: %dpx'.format(pixels, pixels);
            this._activitiesIconButton._iconBin.show();
            this._activitiesIconButton._iconBin.child.set_style(iconStyle);
        }
    },

    _setText: function() {
        let labelText = this._settings.get_string(Keys.NEW_TXT) || this._savedText;
        if(this._settings.get_boolean(Keys.NO_TEXT))
            labelText = '';
        this._activitiesIconButton._label.set_text(labelText);
        if(labelText != '') {
            let pixels = this._settings.get_int(Keys.PAD_TXT);
            let textStyle = 'padding-left: %dpx; padding-right: %dpx'.format(pixels, pixels);
            this._activitiesIconButton._label.set_style(textStyle);
            let ct = this._activitiesIconButton._label.get_clutter_text();
            ct.set_use_markup(true);
        }
    },

    _hotCornersChanged: function() {
        this._savedToggleOverview = [];
        for(let i = 0; i < Main.layoutManager.hotCorners.length; i++) {
            if(Main.layoutManager.hotCorners[i] != null) {
                if(!this._barriersSupported) {
                    this._savedToggleOverview[i] = Main.layoutManager.hotCorners[i]._toggleOverview;
                    Main.layoutManager.hotCorners[i]._toggleOverview = _overviewToggler;
                }
            }
        }
        this._handleBarrierSupport();
    },

    _handleBarrierSupport: function() {
        if(this._barriersSupported) {
           for(let i = 0; i < Main.layoutManager.hotCorners.length; i++) {
               if(Main.layoutManager.hotCorners[i] != null)
                   Main.layoutManager.hotCorners[i]._pressureBarrier._threshold = toggleThreshold;
           }
        }
    },

    _setHotCornerThreshold: function() {
        this._activitiesIconButton._hotCornerThreshold = this._settings.get_int(this._hotKey);
        this._setHotCorner();
    },

    _setHotCorner: function() {
        if(this._settings.get_boolean(Keys.NO_HOTC))
            toggleThreshold = DISABLE_TOGGLE;
        else
            toggleThreshold = this._activitiesIconButton._hotCornerThreshold;
        if(this._barriersSupported)
            this._handleBarrierSupport();
    },

    _setActivities: function() {
        let indicator = Main.panel.statusArea['activities-icon-button'];
        if(indicator != null) {
            if(this._settings.get_boolean(Keys.REMOVED)) {
                indicator.container.hide();
            } else {
                indicator.container.show();
            }
        }
    },

    _setPanelStyle: function(backgroundStyle) {
        Main.panel.actor.set_style(backgroundStyle);
    },

    _removePanelStyle: function() {
        Main.panel.actor.set_style(null);
        if(this._roundedCornersHidden) {
            Main.panel._leftCorner.actor.hide();
            Main.panel._rightCorner.actor.hide();
        } else {
            Main.panel._leftCorner.actor.show();
            Main.panel._rightCorner.actor.show();
        }
    },

    _setPanelColor: function() {
        this._panelColor = Colors.getColorRGB(this._settings.get_string(Keys.COLOURS));
        this._setPanelBackground();
    },

    _setPanelTransparency: function() {
        this._panelOpacity = (100 - this._settings.get_int(Keys.TRS_PAN)) / 100;
        if(this._transparencySig != null) {
            this._settings.disconnect(this._transparencySig);
            this._settingsSignals.pop();
            this._transparencySig = null;
            this._setPanelBackground();
        }
    },

    _setHiddenCorners: function() {
        this._roundedCornersHidden = this._settings.get_boolean(Keys.HIDE_RC);
        this._setPanelBackground();
    },

    _setPanelBackground: function(dynamicOpaquePanel) {
        let colorString;
        if(dynamicOpaquePanel !== undefined) {
            this._settings.disconnect(this._transparencySig);
            this._settingsSignals.pop();
            this._transparencySig = null;
            if(dynamicOpaquePanel) {
                if(this._maxWinEffect > 1) {
                    colorString = '0,0,0';
                } else {
                    colorString = Colors.getColorStringCSS(this._panelColor);
                }
                this._panelOpacity = 1;
            } else {
                colorString = Colors.getColorStringCSS(this._panelColor);
                this._panelOpacity = (100 - this._settings.get_int(Keys.TRS_PAN)) / 100;
            }
        } else {
            colorString = Colors.getColorStringCSS(this._panelColor);
        }
        if(colorString == '0,0,0' && this._panelOpacity == 1) {
            this._removePanelStyle();
        } else {
            let backgroundStyle = 'background-color: rgba(' + colorString + ',' + this._panelOpacity.toString() + ')';
            this._setPanelStyle(backgroundStyle);
            if(this._panelOpacity < .05 || this._roundedCornersHidden) {
                Main.panel._leftCorner.actor.hide();
                Main.panel._rightCorner.actor.hide();
            } else {
                Main.panel._leftCorner.actor.show();
                Main.panel._rightCorner.actor.show();
            }
        }
        if(this._transparencySig == null) {
            this._transparencySig = this._settings.connect('changed::'+Keys.TRS_PAN, Lang.bind(this, this._setPanelTransparency));
            this._settingsSignals.push(this._transparencySig);
        }
        if(Main.panel.actor.get_style() == null || !Main.panel._leftCorner.actor.visible) {
            this._handleCornerSignals(false);
        } else {
            this._handleCornerSignals(true);
        }
    },

    _redoLeft: function() {
        this._repaintPanelCorner(Main.panel._leftCorner);
    },

    _redoRight: function() {
        this._repaintPanelCorner(Main.panel._rightCorner);
    },

    _repaintPanelCorner: function(corner) {
        let panelBackgroundColor = Colors.getClutterColor(this._panelColor, this._panelOpacity);
        let node = corner.actor.get_theme_node();
        let cornerRadius = node.get_length('-panel-corner-radius');
        let borderWidth = node.get_length('-panel-corner-border-width');
        let borderColor = node.get_color('-panel-corner-border-color');
        let overlap = borderColor.alpha != 0;
        let offsetY = overlap ? 0 : borderWidth;
        let cr = corner.actor.get_context();
        cr.setOperator(Cairo.Operator.SOURCE);
        cr.moveTo(0, offsetY);
        if (corner._side == St.Side.LEFT)
            cr.arc(cornerRadius, borderWidth + cornerRadius, cornerRadius, Math.PI, 3 * Math.PI / 2);
        else
            cr.arc(0, borderWidth + cornerRadius, cornerRadius, 3 * Math.PI / 2, 2 * Math.PI);
        cr.lineTo(cornerRadius, offsetY);
        cr.closePath();
        let savedPath = cr.copyPath();
        let xOffsetDirection = corner._side == St.Side.LEFT ? -1 : 1;
        let over = Panel._over(borderColor, panelBackgroundColor);
        Clutter.cairo_set_source_color(cr, over);
        cr.fill();
        if (overlap) {
            let offset = borderWidth;
            Clutter.cairo_set_source_color(cr, panelBackgroundColor);
            cr.save();
            cr.translate(xOffsetDirection * offset, - offset);
            cr.appendPath(savedPath);
            cr.fill();
            cr.restore();
        }
        cr.$dispose();
        return true;
    },

    _setConflictDetection: function() {
        this._conflictDetection = this._settings.get_boolean(Keys.CON_DET);
        if(this._conflictDetection && this._enabled)
            this._conflicts();
        if(this._conflictDetection && this._checkConflictSignal == null)
            this._checkConflictSignal = Main.panel._leftBox.connect('actor-added', Lang.bind(this, this._conflicts));
        if(!this._conflictDetection && this._checkConflictSignal != null) {
            Main.panel._leftBox.disconnect(this._checkConflictSignal);
            this._checkConflictSignal = null;
        }
    },

    destroy: function() {
        this._activitiesIconButton.destroy();
        this._activitiesIconButton = null;
    },

/*  Conflict Resolution:

    This extension's ActivitiesIconButton prefers to occupy the Activities position (the leftmost) in the Panel.
    At session startup this extension delays its enable processing for 500ms to insure that it can insert itself
    in the left panel at position 0.  This solves most conflicts.  If another extension inserts an indicator in
    position 0 at a later time then the ActivitiesIconButton can be moved from its preferred place. To re-establish
    its position this function is called when an 'actor-added' signal occurs.  A race condition can occur if another
    extension follows this strategy.  This extension will stop the race if one is detected.  If the user does not
    care about the position of the ActivitiesIconButton, conflict detection can be disabled.
*/
    _conflicts: function() {
        if (Main.sessionMode.currentMode == 'user') {
            if(Main.panel._leftBox.get_first_child().name != 'panelActivitiesIconButtonContainer') {
                this._conflictCount = this._conflictCount + 1;
                if(this._conflictCount > 30) {
                    Notify.notifyError(_N(CONFLICT),Readme.makeTextStr(Readme.CONFLICTS));
                    this._conflictCount = 0;
                    this.disable();
                } else {
                    this.disable();
                    this._timeoutId = Mainloop.timeout_add(1000, Lang.bind(this, this._delayedEnable));
                }
            }
        }
    },

    _delayedEnable: function() {
        if(this._timeoutId != 0) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        this._activitiesIconButton = new ActivitiesIconButton();
        this._activitiesIndicator = Main.panel.statusArea['activities'];
        if(this._activitiesIndicator != null) {
            this._signalShow = this._activitiesIndicator.container.connect('show', Lang.bind(this, function() {
                this._activitiesIndicator = Main.panel.statusArea['activities'];
                if(this._activitiesIndicator != null)
                    this._activitiesIndicator.container.hide();
            }));
            this._activitiesIndicator.container.hide();
        }
        this._connectSettings();
        this._setText();
        this._iconPath = '';
        this._setIcon();
        this._setHotCornerThreshold();
        this._setHiddenCorners();
        this._setPanelBackground();
        Main.panel.addToStatusArea('activities-icon-button', this._activitiesIconButton, 0, 'left');
        Main.panel._leftCorner.setStyleParent(Main.panel._leftBox);
        this._setActivities();
        this._setConflictDetection();
        if(Main.sessionMode.currentMode == 'user') {
            this._setHotCorner();
            this._hotCornersChanged();
            this._signalHotCornersChanged = Main.layoutManager.connect('hot-corners-changed', Lang.bind(this, this._hotCornersChanged));
        }
        this._maxWindowPanelEffect();
        if(this._firstEnable && Main.sessionMode.currentMode == 'user')
            Main.Util.trySpawnCommandLine('gnome-shell-extension-prefs ' + Me.metadata.uuid);
        this._enabled = true;
    },

    enable: function() {
        this._conflictDetection = this._settings.get_boolean(Keys.CON_DET);
        if((this._conflictDetection || this._firstEnable) &&  Main.sessionMode.currentMode == 'user') {
            this._timeoutId = Mainloop.timeout_add(500, Lang.bind(this, this._delayedEnable));
        } else {
            this._delayedEnable();
        }
    },

    disable: function() {
        if(this._timeoutId != 0) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if (this._enabled) {
            this._disconnectSignals();
            for(let i = 0; i < Main.layoutManager.hotCorners.length; i++) {
                if(Main.layoutManager.hotCorners[i] != null) {
                    Main.layoutManager.hotCorners[i]._pressureBarrier._threshold = this._savedBarrierThreshold;
                    if(!this._barriersSupported)
                        Main.layoutManager.hotCorners[i]._toggleOverview = this._savedToggleOverview[i];
                }
            }
            this._removePanelStyle();
            this._activitiesIndicator = Main.panel.statusArea['activities'];
            if(this._activitiesIndicator != null) {
                if(this._signalShow != null)
                    this._activitiesIndicator.container.disconnect(this._signalShow);
                this._activitiesIndicator.container.show();
            }
            this._activitiesIconButton.destroy();
            this._activitiesIconButton = null;
            Main.panel._updatePanel();
            this._enabled = false;
        }
    }
});

let toggleThreshold = 0;

function _overviewToggler() {

    if (this._monitor.inFullscreen)
        return;

    if (Main.overview.shouldToggleByCornerOrButton()) {
        if (toggleThreshold != DISABLE_TOGGLE) {
            if (toggleThreshold > 0) {
                Mainloop.timeout_add(toggleThreshold, Lang.bind(this, function() {
                    if (this._entered) {
                        this._rippleAnimation();
                        Main.overview.toggle();
                    }
                }));
            } else {
                this._rippleAnimation();
                Main.overview.toggle();
            }
        }
    }
}

function init(metadata) {
    Convenience.initTranslations();
    return new Configurator();
}
