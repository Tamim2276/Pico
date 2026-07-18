import { View, Text, StyleSheet } from "react-native";

export default function Welcome() {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>
                Meet Pico
            </Text>

            <Text style={styles.subheader}>
                Your Personal Assistant
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 40
    },

    header: {
        fontSize: 32,
        color: "#E3E3E3",
        fontWeight: "bold",
    },

    subheader: {
        fontSize: 22,
        color: "#E3E3E3",
        marginTop: 8,
    },
    chatArea: {
        flex: 1
    }
});