import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useGlobalContext } from "../context/GlobalContext";

export default function CheckoutMercadoPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const { atualizarStatusPedido, limparCarrinho } = useGlobalContext();
  const { paymentUrl, pedidoId } = route.params || {};
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentUrl) {
      setLoading(false);
      return;
    }

    let active = true;

    const openCheckout = async () => {
      try {
        await WebBrowser.openBrowserAsync(paymentUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: "#6B3FE4",
          toolbarColor: "#6B3FE4",
          showTitle: true,
        });
      } catch (error) {
        if (active) {
          Alert.alert("Erro", "Não foi possível abrir o checkout do Mercado Pago.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    openCheckout();

    return () => {
      active = false;
    };
  }, [paymentUrl]);

  if (!paymentUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Checkout indisponível</Text>
        <Text style={styles.subtitle}>Não foi possível carregar o pagamento.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6B3FE4" />
          <Text style={styles.loadingText}>Abrindo checkout dentro do app...</Text>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Finalize o pagamento</Text>
          <Text style={styles.subtitle}>
            O pagamento foi aberto em uma janela do navegador dentro do app. Complete o fluxo e volte para continuar.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setLoading(true);
              WebBrowser.openBrowserAsync(paymentUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                controlsColor: "#6B3FE4",
                toolbarColor: "#6B3FE4",
                showTitle: true,
              }).finally(() => setLoading(false));
            }}
          >
            <Text style={styles.buttonText}>Abrir checkout novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    zIndex: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#444",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6B3FE4",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
