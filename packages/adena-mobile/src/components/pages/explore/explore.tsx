import React, { ReactElement } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogoKind, appLogos } from '../../../assets';
import { ListRow, TopBar, useFloatingNavigationClearance } from '../../molecules';
import { styles } from './explore.styles';

export interface ExploreAppView {
  id: string;
  name: string;
  description: string;
  logo: string;
  host: string;
}

export interface ExplorePageProps {
  apps: ExploreAppView[];
  onOpenApp: (id: string) => void;
}

const AppLogo = ({ logo }: { logo: string }): ReactElement => {
  const entry = appLogos[logo];

  if (!entry) {
    return <View style={styles.logo} />;
  }

  return entry.kind === AppLogoKind.SVG
    ? <View style={styles.logo}><entry.Component width={40} height={40} /></View>
    : <Image source={entry.source} style={styles.logo} accessibilityIgnoresInvertColors />;
};

export const ExplorePage = ({ apps, onOpenApp }: ExplorePageProps): ReactElement => {
  const bottomClearance = useFloatingNavigationClearance();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar title='Explore' />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}>
        {apps.map((app) => {
          const handlePress = (): void => onOpenApp(app.id);

          return (
            <ListRow
              key={app.id}
              leading={<AppLogo logo={app.logo} />}
              label={app.name}
              description={app.description}
              value={app.host}
              onPress={handlePress}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};
