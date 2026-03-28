import { getTranslations } from 'next-intl/server';

import { ThreeShowcase } from '@/components/three-showcase';
import { StorytellingExperience } from '@/components/storytelling-experience';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const storyScenes = [
  {
    id: 'arrival',
    title: 'Act I — Arrival',
    description: 'The camera eases into the world as your audience enters the story space.',
    progressionStart: 0,
    progressionEnd: 30,
    color: '#4f46e5',
    position: [-2.4, -0.5, -1] as [number, number, number],
    scale: 0.9,
  },
  {
    id: 'conflict',
    title: 'Act II — Conflict',
    description: 'Tension rises. Smooth, frame-by-frame transitions keep the narrative cinematic.',
    progressionStart: 30,
    progressionEnd: 75,
    color: '#f59e0b',
    position: [0.2, 0.4, 0] as [number, number, number],
    scale: 1.15,
  },
  {
    id: 'resolution',
    title: 'Act III — Resolution',
    description: 'Everything settles into a calm finale while the progression reaches 100.',
    progressionStart: 75,
    progressionEnd: 100,
    color: '#10b981',
    position: [2.4, -0.3, -1.2] as [number, number, number],
    scale: 0.95,
  },
];

export default async function StoryPage() {
  const t = await getTranslations('StoryPage');

  return (
    <div className="space-y-8">
      <Card className="mx-auto max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('note')}</p>
        </CardContent>
      </Card>

      <ThreeShowcase />

      <StorytellingExperience scenes={storyScenes} />
    </div>
  );
}
