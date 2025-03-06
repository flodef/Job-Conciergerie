'use client';

import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import ConfirmationModal from '../components/confirmationModal';
import LoadingSpinner from '../components/loadingSpinner';
import { ToastMessage, ToastType } from '../components/toastMessage';
import { useTheme } from '../contexts/themeProvider';
import colorOptions from '../data/colors.json';
import conciergeriesData from '../data/conciergeries.json';
import { Conciergerie, Employee } from '../types/types';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams, updateConciergerieData, updateEmployeeData } from '../utils/welcomeParams';

type UserInfo = {
  userType: 'conciergerie' | 'employee' | null;
  employeeData: Employee | null;
  conciergerieData: Conciergerie | null;
};

type ColorOption = {
  name: string;
  value: string;
};

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    userType: null,
    employeeData: null,
    conciergerieData: null,
  });
  const { setPrimaryColor } = useTheme();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNukeConfirmation, setShowNukeConfirmation] = useState(false);

  // Form state for editable fields
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>(ToastType.Success);

  // Track original values for comparison
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalTel, setOriginalTel] = useState('');
  const [originalColorName, setOriginalColorName] = useState('');

  // Redirect if not registered
  useRedirectIfNotRegistered();

  // Load user info and set form values
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      // Add a small delay to simulate loading and ensure localStorage is read
      // await new Promise(resolve => setTimeout(resolve, 500));

      const params = getWelcomeParams();
      setUserInfo({
        userType: params.userType,
        employeeData: params.employeeData,
        conciergerieData: params.conciergerieData,
      });

      if (params.userType === 'conciergerie' && params.conciergerieData) {
        // Set current form values for conciergerie
        setEmail(params.conciergerieData.email || '');
        setTel(params.conciergerieData.tel || '');

        // Store original values for comparison
        setOriginalEmail(params.conciergerieData.email || '');
        setOriginalTel(params.conciergerieData.tel || '');
        setOriginalColorName(params.conciergerieData.colorName || '');

        // Find matching color from our options
        const matchingColor = colorOptions.find(color => color.name === params.conciergerieData?.colorName);
        setSelectedColor(matchingColor || null);

        // Apply theme color if conciergerie data exists
        if (params.conciergerieData.color) {
          setPrimaryColor(params.conciergerieData.color);
        }
      } else if (params.userType === 'employee' && params.employeeData) {
        // Set employee data for form
        setEmail(params.employeeData.email || '');
        setTel(params.employeeData.tel || '');

        // Store original values for comparison
        setOriginalEmail(params.employeeData.email || '');
        setOriginalTel(params.employeeData.tel || '');
      }

      setIsLoading(false);
    };

    loadData();
  }, [setPrimaryColor]);

  // Check if a color is already used by another conciergerie
  const isColorUsed = (colorName: string) => {
    if (!userInfo?.conciergerieData) return false;

    // Find conciergeries that are not the current one
    const otherConciergeries = conciergeriesData.filter(c => c.name !== userInfo.conciergerieData?.name);

    // Check if any other conciergerie uses this color
    return otherConciergeries.some(c => c.colorName === colorName);
  };

  // Check if form has been modified
  const hasChanges = () => {
    if (userInfo.userType === 'conciergerie' && userInfo.conciergerieData) {
      const emailChanged = email !== originalEmail;
      const telChanged = tel !== originalTel;
      const colorChanged = selectedColor?.name !== originalColorName;
      return emailChanged || telChanged || colorChanged;
    } else if (userInfo.userType === 'employee' && userInfo.employeeData) {
      const emailChanged = email !== originalEmail;
      const telChanged = tel !== originalTel;
      return emailChanged || telChanged;
    }
    return false;
  };

  // Handle form submission
  const handleSave = () => {
    if (!userInfo?.conciergerieData && !userInfo?.employeeData) return;

    setIsSaving(true);

    try {
      if (userInfo.userType === 'conciergerie' && userInfo.conciergerieData) {
        // Create updated conciergerie data
        const updatedData = {
          ...userInfo.conciergerieData,
          email,
          tel,
          colorName: selectedColor?.name || userInfo.conciergerieData.colorName,
        };

        // Update in localStorage
        updateConciergerieData(updatedData);

        // Update theme
        if (selectedColor) {
          setPrimaryColor(selectedColor.value);
        }

        // Update local state
        setUserInfo({
          ...userInfo,
          conciergerieData: {
            ...updatedData,
            color: selectedColor?.value || userInfo.conciergerieData.color,
          },
        });
      } else if (userInfo.userType === 'employee' && userInfo.employeeData) {
        // Update employee data
        const updatedData = {
          ...userInfo.employeeData,
          email,
          tel,
        };

        // Save to localStorage
        updateEmployeeData(updatedData);

        // Update local state
        setUserInfo({
          ...userInfo,
          employeeData: updatedData,
        });
      }

      // Update original values to match current values after save
      setOriginalEmail(email);
      setOriginalTel(tel);
      if (selectedColor && userInfo.userType === 'conciergerie') {
        setOriginalColorName(selectedColor.name);
      }

      // Show success toast
      setToastMessage('Modifications enregistrées avec succès');
      setToastType(ToastType.Success);
      setShowToast(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setToastMessage('Erreur lors de l&apos;enregistrement');
      setToastType(ToastType.Error);
      setShowToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto">
        {userInfo.userType === 'conciergerie' && userInfo.conciergerieData && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Informations de la conciergerie</h2>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Nom</label>
                <p className="font-medium">{userInfo.conciergerieData.name}</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground/70 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={clsx(
                    'w-full p-2 border rounded-md',
                    'border-foreground/20',
                    'focus:outline-none focus:ring-2',
                  )}
                  style={
                    {
                      '--tw-ring-color': selectedColor?.value || userInfo.conciergerieData.color,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div>
                <label htmlFor="tel" className="block text-sm font-medium text-foreground/70 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="tel"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  className={clsx(
                    'w-full p-2 border rounded-md',
                    'border-foreground/20',
                    'focus:outline-none focus:ring-2',
                  )}
                  style={
                    {
                      '--tw-ring-color': selectedColor?.value || userInfo.conciergerieData.color,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">Couleur</label>
                <div className="grid grid-cols-3 gap-3">
                  {colorOptions.map(color => {
                    const isUsed = isColorUsed(color.name);
                    const isSelected = selectedColor?.name === color.name;

                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          if (!isUsed || isSelected) {
                            setSelectedColor(color);
                          }
                        }}
                        disabled={isUsed && !isSelected}
                        className={`
                          relative flex flex-col items-center space-y-1 p-2 border rounded-md transition-all
                          ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-secondary'}
                          ${isUsed && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/10'}
                        `}
                        title={
                          isUsed && !isSelected
                            ? 'Cette couleur est déjà utilisée par une autre conciergerie'
                            : color.name
                        }
                      >
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color.value }} />
                        <span>{color.name}</span>

                        {/* Diagonal "utilisée" label for used colors */}
                        {isUsed && !isSelected && (
                          <div
                            className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
                            aria-hidden="true"
                          >
                            <div
                              className="absolute text-sm font-bold text-foreground/80 bg-background/70 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap"
                              style={{
                                transform: 'rotate(45deg) scale(0.9)',
                                transformOrigin: 'center',
                                width: '140%',
                                textAlign: 'center',
                              }}
                            >
                              UTILISÉE
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  className={`px-4 py-2 text-white rounded-md transition-colors ${
                    hasChanges() ? 'bg-primary hover:bg-primary/80' : 'bg-primary/50 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </div>
        )}

        {userInfo.userType === 'employee' && userInfo.employeeData && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Informations du prestataire</h2>

            <div>
              <p className="text-sm text-foreground/70 mb-1">Nom</p>
              <p className="font-medium">
                {userInfo.employeeData.firstName} {userInfo.employeeData.familyName}
              </p>
            </div>

            <div>
              <p className="text-sm text-foreground/70 mb-1">Conciergerie</p>
              <p className="font-medium">{userInfo.employeeData.conciergerieName}</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground/70 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={clsx(
                  'w-full p-2 border rounded-md',
                  'border-foreground/20',
                  'focus:outline-none focus:ring-2',
                )}
                style={
                  {
                    '--tw-ring-color': 'var(--color-primary)',
                  } as React.CSSProperties
                }
              />
            </div>

            <div>
              <label htmlFor="tel" className="block text-sm font-medium text-foreground/70 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                id="tel"
                value={tel}
                onChange={e => setTel(e.target.value)}
                className={clsx(
                  'w-full p-2 border rounded-md',
                  'border-foreground/20',
                  'focus:outline-none focus:ring-2',
                )}
                style={
                  {
                    '--tw-ring-color': 'var(--color-primary)',
                  } as React.CSSProperties
                }
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSave}
                disabled={isSaving || (email === originalEmail && tel === originalTel)}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  email !== originalEmail || tel !== originalTel
                    ? 'bg-primary hover:bg-primary/80'
                    : 'bg-primary/50 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-medium mb-4">Options avancées</h3>
          <div className="flex flex-col space-y-4 text-center">
            <div>
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                Réinitialiser mes données
              </button>
              <p className="text-sm text-foreground/70 mt-2">
                Cette action supprimera votre accès à l&apos;application et vous redirigera vers la page d&apos;accueil.
              </p>
            </div>

            {/* Nuke button - only for conciergerie */}
            {userInfo.userType === 'conciergerie' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowNukeConfirmation(true)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors"
                >
                  Supprimer toutes les données
                </button>
                <p className="text-sm text-foreground/70 mt-2">
                  Cette action supprimera toutes les données de l&apos;application, y compris les missions, les
                  prestataires et les logements.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast message */}
      {showToast && <ToastMessage message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          // Clear only the user type from localStorage (keep other data)
          localStorage.removeItem('user_type');

          // Force a full page reload to reset the app state
          window.location.href = '/';
        }}
        title="Réinitialiser mes données"
        confirmText="Réinitialiser"
        cancelText="Annuler"
        isDangerous={true}
      >
        <p>Êtes-vous sûr de vouloir réinitialiser vos données personnelles ? Cette action est importante car :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Vous serez déconnecté de votre profil actuel</li>
          <li>Vous devrez remplir à nouveau votre profil utilisateur et faire une demande d&apos;accès</li>
          <li>Vos données personnelles resteront enregistrées mais ne seront plus associées à votre profil</li>
        </ul>
      </ConfirmationModal>

      {/* Nuke confirmation modal */}
      <ConfirmationModal
        isOpen={showNukeConfirmation}
        onClose={() => setShowNukeConfirmation(false)}
        onConfirm={() => {
          // Clear all data from localStorage
          localStorage.clear();

          // Force a full page reload to reset the app state
          window.location.href = '/';
        }}
        title="Supprimer toutes les données"
        confirmText="Supprimer tout"
        cancelText="Annuler"
        isDangerous={true}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer toutes les données de l&apos;application ? Cette action est irréversible et
          :
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Supprimera toutes les missions, prestataires et logements</li>
          <li>Déconnectera tous les utilisateurs</li>
          <li>Réinitialisera complètement l&apos;application</li>
          <li>Vous devrez reconfigurer entièrement votre conciergerie</li>
        </ul>
      </ConfirmationModal>
    </div>
  );
}
