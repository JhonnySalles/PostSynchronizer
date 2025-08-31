package com.facebook.react;

import android.app.Application;
import android.content.Context;
import android.content.res.Resources;

import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.ArrayList;

// @react-native-community/image-editor
import com.reactnativecommunity.imageeditor.ImageEditorPackage;
// @react-native-picker/picker
import com.reactnativecommunity.picker.RNCPickerPackage;
// @sentry/react-native
import io.sentry.react.RNSentryPackage;
// react-native-fs
import com.rnfs.RNFSPackage;
// react-native-image-picker
import com.imagepicker.ImagePickerPackage;
// react-native-inappbrowser-reborn
import com.proyecto26.inappbrowser.RNInAppBrowserPackage;
// react-native-safe-area-context
import com.th3rdwave.safeareacontext.SafeAreaContextPackage;
// react-native-screens
import com.swmansion.rnscreens.RNScreensPackage;
// react-native-sqlite-storage
import org.pgsqlite.SQLitePluginPackage;
// react-native-vector-icons
import com.oblador.vectoricons.VectorIconsPackage;

public class PackageList {
  private Application application;
  private ReactNativeHost reactNativeHost;
  private MainPackageConfig mConfig;

  public PackageList(ReactNativeHost reactNativeHost) {
    this(reactNativeHost, null);
  }

  public PackageList(Application application) {
    this(application, null);
  }

  public PackageList(ReactNativeHost reactNativeHost, MainPackageConfig config) {
    this.reactNativeHost = reactNativeHost;
    mConfig = config;
  }

  public PackageList(Application application, MainPackageConfig config) {
    this.reactNativeHost = null;
    this.application = application;
    mConfig = config;
  }

  private ReactNativeHost getReactNativeHost() {
    return this.reactNativeHost;
  }

  private Resources getResources() {
    return this.getApplication().getResources();
  }

  private Application getApplication() {
    if (this.reactNativeHost == null) return this.application;
    return this.reactNativeHost.getApplication();
  }

  private Context getApplicationContext() {
    return this.getApplication().getApplicationContext();
  }

  public ArrayList<ReactPackage> getPackages() {
    return new ArrayList<>(Arrays.<ReactPackage>asList(
      new MainReactPackage(mConfig),
      new ImageEditorPackage(),
      new RNCPickerPackage(),
      new RNSentryPackage(),
      new RNFSPackage(),
      new ImagePickerPackage(),
      new RNInAppBrowserPackage(),
      new SafeAreaContextPackage(),
      new RNScreensPackage(),
      new SQLitePluginPackage(),
      new VectorIconsPackage()
    ));
  }
}