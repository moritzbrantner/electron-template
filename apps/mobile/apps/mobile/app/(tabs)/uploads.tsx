import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatFileSize,
  getAllUploadGuides,
  getUploadGuide,
  getUploadManagementHint,
  inferUploadKind,
  mobileUploadPresets,
  uploadLifecycle,
  uploadTypeGroups,
} from '@repo/upload-playbook';

import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type UploadQueueItem = {
  id: string;
  fileName: string;
  sizeInBytes: number;
  source: string;
  kind: string;
  managementLabel: string;
  managementDetail: string;
};

export default function UploadsScreen() {
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const accentColor = useThemeColor({}, 'accent');
  const accentSurface = useThemeColor({}, 'accentSurface');
  const uploadGuide = getUploadGuide('mobile');
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);

  function appendPreset(preset: (typeof mobileUploadPresets)[number]) {
    const kind = inferUploadKind(preset.fileName, preset.mimeType);
    const management = getUploadManagementHint(kind, preset.sizeInBytes);

    setQueue((currentQueue) => [
      {
        id: `${preset.id}-${currentQueue.length}`,
        fileName: preset.fileName,
        sizeInBytes: preset.sizeInBytes,
        source: preset.source,
        kind,
        managementLabel: management.label,
        managementDetail: management.detail,
      },
      ...currentQueue,
    ]);
  }

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Uploads</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              This mobile screen shows how native-style intake sources feed the same normalized
              queue used by the web and desktop demos.
            </ThemedText>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
              {uploadGuide.title}
            </ThemedText>
            <ThemedText type="subtitle">How the mobile app should manage uploads</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>{uploadGuide.picker}</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>{uploadGuide.queue}</ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>{uploadGuide.storage}</ThemedText>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
              Native intake actions
            </ThemedText>
            <ThemedText style={{ color: mutedTextColor }}>
              This template keeps the native picker adapter mocked so the queue model stays visible
              without adding extra Expo modules first.
            </ThemedText>
            <ThemedView style={styles.actionList}>
              {mobileUploadPresets.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={[styles.actionButton, { borderColor, backgroundColor: accentSurface }]}
                  onPress={() => appendPreset(preset)}>
                  <ThemedText type="defaultSemiBold">{preset.label}</ThemedText>
                  <ThemedText style={{ color: mutedTextColor }}>
                    {preset.fileName} · {preset.source}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView
            style={[styles.card, { borderColor }]}
            lightColor={Colors.light.surface}
            darkColor={Colors.dark.surface}>
            <ThemedView style={styles.queueHeader}>
              <ThemedView style={styles.queueTitle}>
                <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
                  Normalized queue
                </ThemedText>
                <ThemedText type="subtitle">Current upload items</ThemedText>
              </ThemedView>
              <Pressable
                style={[styles.clearButton, { borderColor }]}
                onPress={() => setQueue([])}
                disabled={queue.length === 0}>
                <ThemedText type="defaultSemiBold">Clear queue</ThemedText>
              </Pressable>
            </ThemedView>

            {queue.length === 0 ? (
              <ThemedText style={{ color: mutedTextColor }}>
                No files yet. Add a mock document, photo, or share sheet item to inspect the mobile
                queue behavior.
              </ThemedText>
            ) : (
              <ThemedView style={styles.queueList}>
                {queue.map((item) => (
                  <ThemedView
                    key={item.id}
                    style={[styles.queueItem, { borderColor }]}
                    lightColor={Colors.light.background}
                    darkColor={Colors.dark.background}>
                    <ThemedView style={styles.queueMeta}>
                      <ThemedView style={styles.queueTitle}>
                        <ThemedText type="defaultSemiBold">{item.fileName}</ThemedText>
                        <ThemedText style={{ color: mutedTextColor }}>
                          {item.kind} · {formatFileSize(item.sizeInBytes)} · {item.source}
                        </ThemedText>
                      </ThemedView>
                      <ThemedView
                        style={[styles.badge, { borderColor: accentColor, backgroundColor: accentSurface }]}>
                        <ThemedText type="defaultSemiBold" style={{ color: accentColor }}>
                          {item.managementLabel}
                        </ThemedText>
                      </ThemedView>
                    </ThemedView>
                    <ThemedText style={{ color: mutedTextColor }}>{item.managementDetail}</ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
          </ThemedView>

          <ThemedView style={styles.comparisonGrid}>
            {getAllUploadGuides().map((guide) => (
              <ThemedView
                key={guide.platform}
                style={[
                  styles.comparisonCard,
                  { borderColor: guide.platform === 'mobile' ? accentColor : borderColor },
                ]}
                lightColor={Colors.light.surface}
                darkColor={Colors.dark.surface}>
                <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
                  {guide.platform}
                </ThemedText>
                <ThemedText type="subtitle">{guide.title}</ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>{guide.picker}</ThemedText>
                <ThemedText style={{ color: mutedTextColor }}>{guide.queue}</ThemedText>
                {guide.notes.map((note) => (
                  <ThemedText key={note} style={{ color: mutedTextColor }}>
                    • {note}
                  </ThemedText>
                ))}
              </ThemedView>
            ))}
          </ThemedView>

          <ThemedView style={styles.comparisonGrid}>
            <ThemedView
              style={[styles.comparisonCard, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>
                Accepted groups
              </ThemedText>
              {uploadTypeGroups.map((group) => (
                <ThemedView key={group.title} style={[styles.infoRow, { borderColor }]}>
                  <ThemedText type="subtitle">{group.title}</ThemedText>
                  <ThemedText style={{ color: mutedTextColor }}>{group.examples}</ThemedText>
                  <ThemedText style={{ color: mutedTextColor }}>{group.handling}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>

            <ThemedView
              style={[styles.comparisonCard, { borderColor }]}
              lightColor={Colors.light.surface}
              darkColor={Colors.dark.surface}>
              <ThemedText style={[styles.eyebrow, { color: mutedTextColor }]}>Lifecycle</ThemedText>
              {uploadLifecycle.map((step, index) => (
                <ThemedView key={step.title} style={[styles.infoRow, { borderColor }]}>
                  <ThemedText type="subtitle">
                    {index + 1}. {step.title}
                  </ThemedText>
                  <ThemedText style={{ color: mutedTextColor }}>{step.detail}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    gap: 10,
  },
  card: {
    gap: 14,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  actionList: {
    gap: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  queueTitle: {
    gap: 6,
    flexShrink: 1,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  queueList: {
    gap: 12,
  },
  queueItem: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  queueMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  comparisonGrid: {
    gap: 16,
  },
  comparisonCard: {
    gap: 12,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  infoRow: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
});
