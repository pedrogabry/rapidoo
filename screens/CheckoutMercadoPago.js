import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useGlobalContext } from "../context/GlobalContext";

export default function CheckoutMercadoPago() {
  const navigation = useNavigation();
  const route = useRoute();
  const { limparCarrinho } = useGlobalContext();
  const { paymentUrl, pedidoId } = route.params || {};
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentUrl) {
      setLoading(false);
      return;
    }

    const openCheckout = async () => {
      try {
        const supported = await Linking.canOpenURL(paymentUrl);
        if (supported) {
          await Linking.openURL(paymentUrl);
        } else {
          Alert.alert("Erro", "Não foi possível abrir o checkout do Mercado Pago.");
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível abrir o checkout do Mercado Pago.");
      } finally {
        setLoading(false);
      }
    };

    openCheckout();
  }, [paymentUrl]);

  const handleContinueToTracking = async () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "AcompanhamentoPedido", params: { pedidoId } }],
    });
  };

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
          <Text style={styles.loadingText}>Abrindo checkout no navegador...</Text>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Finalize o pagamento</Text>
          <Text style={styles.subtitle}>
            O Mercado Pago foi aberto no navegador do dispositivo. Complete o pagamento e volte ao app.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              setLoading(true);
              try {
                await Linking.openURL(paymentUrl);
              } catch (error) {
                Alert.alert("Erro", "Não foi possível abrir o checkout do Mercado Pago.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.buttonText}>Abrir checkout novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleContinueToTracking}>
            <Text style={styles.secondaryButtonText}>Ir para acompanhamento</Text>
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6B3FE4",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: "#F3F3F3",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#444",
    fontWeight: "700",
  },
});
