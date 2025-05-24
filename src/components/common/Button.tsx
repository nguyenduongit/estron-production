// components/common/Button.tsx
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { theme } from "../../theme"; // Giả sử theme được export từ @/theme

// Props cho Button
interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: "primary" | "secondary" | "danger";
  style?: object;
  textStyle?: object;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, type = "primary", style, textStyle, disabled }) => {
  const buttonStyles = [
    styles.button,
    styles[type],
    disabled && styles.disabled,
    style,
  ];
  const textStyles = [styles.text, styles[`${type}Text`], textStyle];

  return (
    <TouchableOpacity onPress={onPress} style={buttonStyles} disabled={disabled}>
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44, // Chiều cao tối thiểu cho dễ chạm
  },
  text: {
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  secondaryText: {
    color: theme.colors.white,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  dangerText: {
    color: theme.colors.white,
  },
  disabled: {
    backgroundColor: theme.colors.grey,
    opacity: 0.7,
  },
});

export default Button;
