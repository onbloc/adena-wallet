import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?
  // Hides wallet content in the app switcher snapshot and while the screen is captured.
  private var privacyCover: UIView?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }

    dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: self)
    window = UIWindow(windowScene: windowScene)
    
    #if DEBUG
    let devMenuConfiguration = RCTDevMenuConfiguration(
      devMenuEnabled: true,
      shakeGestureEnabled: true,
      keyboardShortcutsEnabled: true
    )
    reactNativeFactory?.devMenuConfiguration = devMenuConfiguration
    #endif
    
    reactNativeFactory?.startReactNative(
      withModuleName: "Adena",
      in: window,
      connectionOptions: connectionOptions
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(screenCaptureChanged),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
    // The change notification does not fire for a capture that was already running at launch.
    if windowScene.screen.isCaptured {
      showPrivacyCover()
    }
  }

  func sceneWillResignActive(_ scene: UIScene) {
    showPrivacyCover()
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    if window?.windowScene?.screen.isCaptured == true {
      showPrivacyCover()
    } else {
      hidePrivacyCover()
    }
  }

  @objc private func screenCaptureChanged() {
    if window?.windowScene?.screen.isCaptured == true {
      showPrivacyCover()
    } else if window?.windowScene?.activationState == .foregroundActive {
      hidePrivacyCover()
    }
  }

  private func showPrivacyCover() {
    guard let window, privacyCover == nil else {
      return
    }
    let cover = UIStoryboard(name: "LaunchScreen", bundle: nil).instantiateInitialViewController()?.view
      ?? UIView()
    // Matches the JS canvas; the window's interface style follows the in-app Theme setting.
    cover.backgroundColor = UIColor(named: "LaunchBackground") ?? .systemBackground
    cover.frame = window.bounds
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(cover)
    privacyCover = cover
  }

  private func hidePrivacyCover() {
    privacyCover?.removeFromSuperview()
    privacyCover = nil
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
