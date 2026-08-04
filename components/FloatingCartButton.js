import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useGlobalContext } from "../context/GlobalContext";
import { navigationRef } from "../routes/navigationRef";

export default function FloatingCartButton() {
  const { cartCount, cartTotal } = useGlobalContext();
  const [currentRoute, setCurrentRoute] = useState("");

  useEffect(() => {
    const updateRoute = () => {
      if (navigationRef.isReady()) {
        const current = navigationRef.getCurrentRoute();
        const routeName = current && current.name ? current.name : "";
        setCurrentRoute(routeName);
      }
    };

    updateRoute();

    const unsubscribe = navigationRef.addListener("state", () => {
      updateRoute();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (cartCount <= 0) {
    return null;
  }

  // Ocultar nas telas de Carrinho, Login, Produto, AcompanhamentoPedido e CheckoutMercadoPago
  if (
    currentRoute === "Carrinho" ||
    currentRoute === "Login" ||
    currentRoute === "Produto" ||
    currentRoute === "AcompanhamentoPedido" ||
    currentRoute === "CheckoutMercadoPago"
  ) {
    return null;
  }

  function handleOpenCart() {
    if (navigationRef.isReady()) {
      navigationRef.navigate("Carrinho");
    }
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={handleOpenCart}
      >
        <View style={styles.leftContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.buttonText}>🛒 Ver Carrinho</Text>
        </View>

        <Text style={styles.priceText}>
          R$ {cartTotal.toFixed(2).replace(".", ",")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  button: {
    backgroundColor: "#6B3FE4",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#6B3FE4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#FFF",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  badgeText: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 14,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  priceText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
