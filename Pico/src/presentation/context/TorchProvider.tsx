import React, { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { torchStore } from "@data/device/torchStore";

/**
 * Drives the physical torch.
 *
 * Mount this ONCE, high in the tree (App.tsx), so:
 *   1. the torch persists while the user moves between tabs, and
 *   2. the camera session is initialised before the first toggle — which
 *      dodges the iOS bug where enableTorch=true on a freshly-mounted
 *      CameraView flickers off. We further guard that with onCameraReady.
 *
 * Permission is requested LAZILY: only the first time something asks for the
 * torch (torchStore -> on === true). The app does not demand camera access
 * at launch.
 */
export function TorchProvider({ children }: { children: React.ReactNode }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  // desired torch state, kept in sync with the framework-free store
  const on = useSyncExternalStore(torchStore.subscribe, torchStore.get);

  // ask for permission only when the torch is first requested
  useEffect(() => {
    if (on && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [on, permission, requestPermission]);

  // if permission is revoked, don't leave the store thinking it's on
  useEffect(() => {
    if (permission && !permission.granted && on) {
      torchStore.set(false);
    }
  }, [permission, on]);

  const showCamera = !!permission?.granted;

  return (
    <>
      {children}

      {showCamera && (
        <View style={styles.hidden} pointerEvents="none">
          <CameraView
            style={styles.camera}
            facing="back"
            // only honour the torch once the session is actually ready
            enableTorch={cameraReady && on}
            onCameraReady={() => setCameraReady(true)}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // 1x1, fully transparent, pushed off-screen — invisible but "live"
  hidden: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0,
  },
  camera: {
    width: 1,
    height: 1,
  },
});
