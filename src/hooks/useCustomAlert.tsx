import { useState } from 'react';
import CustomAlert from '../components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface UseCustomAlertReturn {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  CustomAlertComponent: React.FC;
}

export const useCustomAlert = (): UseCustomAlertReturn => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  const showAlert = (alertTitle: string, alertMessage: string, alertButtons: AlertButton[] = [{ text: 'OK' }]) => {
    setTitle(alertTitle);
    setMessage(alertMessage);
    setButtons(alertButtons);
    setVisible(true);
  };

  const CustomAlertComponent = () => (
    <CustomAlert
      visible={visible}
      title={title}
      message={message}
      buttons={buttons}
      onClose={() => setVisible(false)}
    />
  );

  return {
    showAlert,
    CustomAlertComponent,
  };
};