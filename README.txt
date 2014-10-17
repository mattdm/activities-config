README

2012-11-30 Fixed missing corners.  Black opaque panel background displays corners.
           Added German Translations thanks for the efforts of Tobias Bannert.
           Added function to determine utf8 strings length in bytes.
           Created separate branches for Gnome Shell 3.4 and 3.6.

2012-12-02 Uploaded for review.

2012-12-09 Fixed bug in missing icon logic.
           Removed uneeded string length function.

2012-12-10 v12 and v13 active.

2012-12-14 Updated German Translations thanks to Jonatan Zeidler.
           No programmatic changes. Sources same as v12 GS3.4 and v13 GS3.6.
           Uploaded for review.

2013-01-14 Fixed conflicts with some extensions in GS3.6 when screen was locked.
           Fixed inconsistent custom colors in GS3.4 and GS3.6.
           Added pango formating in prefs tool when entering Activities Text,
           ie. <i>Activities</i> displays text in italics.
           Rounded corners are displayed in the color and transparency selected
           for the panel background.  Rounded corners can be hidden.
           The appearance of rounded corners is affected by screen width and
           height ratio, screen resolution, font size and font scaling, screen
           background image and screen background colors and your panel background
           color choice.  The rounded corners with an opaque black panel background
           work well with almost any background image or color.  Other colors and
           levels of transparency for the panel background may or may not work as
           well with your choice of background image or background color.
           Uploaded for review.

2013-04-29 Updated for Gnome Shell 3.8.

           Tested on openSuse 12.3, Fedora 19 Alpha and Arch Linux.

           Thanks to Craig Rob, Sven Gjukison and Simon Perry for 
           their valuable testing, patience and comments.  

           Uploaded for review.
  
           The Hot Corner is removed from the Activities Button in Gnome Shell 3.8.
           The functions performed by Hot Corner Sensitivity and Disable Hot Corner
           preferences are changed to continue providing user control of the Hot 
           Corner as described in the following.

           The Hot Corner Sensitivity preference is renamed Hot Corner Threshold.

           The Barrier Pressure System is introduced in Gnome Shell 3.8 to reduce false
           triggers of the Overview and the Message Tray by wayward pointer movements.
           If Extended Barriers are provided by the installed version of the X server
           the Barrier Pressure System is supported.  If supported the Hot Corner 
           Threshold is a pixel value which is used by the Barrier Pressure System to
           calculate the pressure of the pointer pressing against the barrier.  If the
           pressure exceeds the Hot Corner Threshold the Overview is toggled.  With
           Barrier Pressure System support if the Disable Hot Corner preference is ON
           the Hot Corner Threshold is set to a very high value effectively disabling
           the Hot Corner.  The default threshold pressure is 100 pixels.

           If Extended Barriers are not provided the Barrier Pressure System is not 
           functional.  A fallback is implemented in the extension as follows.  The Hot
           Corner Threshold is a value in milliseconds which is used by a timer to delay
           the triggering of the Overview by the Hot Corner.  When the Disable Hot Corner
           preference is ON the Hot Corner is disabled by ignoring Overview toggles
           initiated by the Hot Corner.  The default threshold delay is 250 milliseconds.

2013-05-03 Bug Fix "Remove Activities Button" ON not effective after shell was restarted.

           Changed approach to sync psuedo style of button with hot corner when switching
           to and from Overview to use native shell code instead of extension hack.

2013-05-08 Changed repaint logic to eliminate double paints except when preference settings
           require it.

2013-09-28 Uploaded for review supports GS3.8 and GS3.10

2013-10-12 Created new branch for GS3.8 and GS3.10

2013-11-23 Added logic to handle hot corners on multiple displays. 
           User reported bug hot corner corner was not disabled on 
           secondary display.
 
           Tested on Fedora Beta F20 GS 3.10 with Pressure Barrier, 
           Arch GS 3.10 with Pressure Barrier, openSuse 12.3 GS 3.8 
           without Pressure Barrier.

2013-11-28 Thanks to Florian Rau for testing Debian Jessie with GS 3.8.
           Uploaded for review.

2014-01-17 Corrected my error that resulted in missing German translations.

2014-04-10 Uploaded new version added 3.12 to metadata.json.

2014-05-02 Added user kubecz3k's suggested feature Window Maximized Effect
           for GS 3.8 and above. kubecz3k saw this effect on a youtube
           video of Elementary Isis: [ http://youtu.be/mzSPGkOyzW8?t=1m30s ].

           For this extension the feature is implemented as follows:

           When a window is maximized on the primary display the panel
           background is affected based on the preference settings.

           1.  No effect on Panel.
           2.  Panel background is set to opaque (transparency removed).
           3.  Panel background is set to opaque and black.

           When the window is unmaximized the panel background returns to the
           original state based on the extension's current preferences.

           Tested on GS 3.8 Fedora 19, GS 3.10 Fedora 20, f20-gnome-3-12 COPR
           and Arch updated today GS 3.12.

2014-05-03 Uploaded for review for GS 3.8, GS 3.10, GS 3.12.

2014-06-08 Corrected bug - hidden window causing false  Window Maximized Effect
           Corrected bug - transparency set incorrectly mainly in virtural machine
           Uploaded for review.

2014-08-27 Corrected bug - in 3.12 function setTransient was removed from Source class.
           Changed to use setTransient in Notification class.
           Uploaded for review.

2014-10-05 Updated for Gnome Shell 3.14  -  Uploaded for review.

           Changed secondary click response on Activities Text/Icon to execute
           gnome-shell-extension-prefs without the extension as an argument due
           to changes in GS 3.14 to the gnome-shell-extension-prefs tool.  The
           behavior is unchanged for earlier versions.

           Added display of extension version number in prefs widget.
           Added horizontal width request to prefs widget scrolled window.

           Changed readme window displayed by prefs to be modal with a parent.

2014-10-06 Passed review version 31 supports GS 3.8, 3.10, 3.12, 3.14.

2014-10-17 Created github repository:  https://github.com/nls1729/activities-config 


zip file: xxx
