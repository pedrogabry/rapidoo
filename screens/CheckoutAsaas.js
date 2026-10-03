import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Linking,
	SafeAreaView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { createAsaasPayment } from "../services/asaas";

export default function CheckoutAsaas() {
	const route = useRoute();
	const { orderId, result } = route.params || {};
	const [loading, setLoading] = useState(false);
	const [checkoutUrl, setCheckoutUrl] = useState(null);
	const [error, setError] = useState(null);

	async function iniciarCheckout() {
		if (!orderId) {
			setError("Não foi possível identificar o pedido.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const payment = await createAsaasPayment(orderId);
			setCheckoutUrl(payment.checkoutUrl);
			await Linking.openURL(payment.checkoutUrl);
		} catch (requestError) {
			setError(requestError.message || "Não foi possível abrir o checkout.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (result) return;
		iniciarCheckout();
	}, [orderId, result]);

	async function abrirCheckoutSalvo() {
		if (!checkoutUrl) return;
		try {
			await Linking.openURL(checkoutUrl);
		} catch {
			setError("Não foi possível abrir o checkout neste dispositivo.");
		}
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.title}>
					{result ? "Retorno do checkout" : "Pagamento do pedido"}
				</Text>
				<Text style={styles.description}>
					{result
						? "O retorno do checkout não confirma o pagamento. Aguarde a confirmação do Asaas."
						: "O checkout seguro do Asaas oferece Pix e cartão de crédito."}
				</Text>

				{loading && <ActivityIndicator size="large" />}
				{error && <Text style={styles.error}>{error}</Text>}

				{!result && !loading && checkoutUrl && (
					<TouchableOpacity style={styles.button} onPress={abrirCheckoutSalvo}>
						<Text style={styles.buttonText}>Abrir checkout</Text>
					</TouchableOpacity>
				)}

				{!result && !loading && !checkoutUrl && error && (
					<TouchableOpacity style={styles.button} onPress={iniciarCheckout}>
						<Text style={styles.buttonText}>Tentar novamente</Text>
					</TouchableOpacity>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	content: {
		width: "100%",
		alignItems: "center",
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 12,
		textAlign: "center",
	},
	description: {
		marginBottom: 20,
		textAlign: "center",
	},
	error: {
		color: "#b42318",
		marginBottom: 16,
		textAlign: "center",
	},
	button: {
		backgroundColor: "#6B3FE4",
		padding: 15,
		borderRadius: 8,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
	},
});