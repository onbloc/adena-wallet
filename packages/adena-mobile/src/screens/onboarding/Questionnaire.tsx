import InfoIcon from '@assets/web/info.svg';
import completeAnimation from '@assets/web/lottie/questionnaire-complete.json';
import startAnimation from '@assets/web/lottie/complete-a-questionnaire.json';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ANSWER_LOCK_SECONDS, QUESTIONS} from '../../core/questionnaire';
import {Animation} from '../../ui/animation';
import {colorTokens, webFonts} from '../../ui/theme';
import {
  WebAnswerButton,
  WebButton,
  WebScreen,
  WebText,
} from '../../ui/web';

const {webNeutral, webWarning} = colorTokens;

/**
 * The extension's security questionnaire before a seed phrase or key is
 * created or imported: an intro, three questions that only move on with the
 * right answer, then a completion page. `onExit` leaves from the intro.
 */
export function Questionnaire({
  header,
  onExit,
  onComplete,
}: {
  /** Builds the step header with the given back action. */
  header: (onBack: () => void) => React.ReactNode;
  onExit: () => void;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'question' | 'complete'>(
    'intro',
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lock, setLock] = useState(0);

  useEffect(() => {
    if (lock <= 0) {
      return;
    }
    const timer = setTimeout(() => setLock(lock - 1), 1_000);
    return () => clearTimeout(timer);
  }, [lock]);

  const resetAnswer = () => {
    setSelected(null);
    setLock(0);
  };

  const back = () => {
    resetAnswer();
    if (phase === 'complete') {
      setPhase('question');
    } else if (phase === 'question' && index > 0) {
      setIndex(index - 1);
    } else if (phase === 'question') {
      setPhase('intro');
    } else {
      onExit();
    }
  };

  if (phase === 'intro' || phase === 'complete') {
    const intro = phase === 'intro';
    return (
      <WebScreen
        header={header(back)}
        footer={
          <WebButton
            testID={intro ? 'questionnaire-start' : 'questionnaire-done'}
            title="Next"
            chevron
            onPress={() => {
              if (intro) {
                setIndex(0);
                setPhase('question');
              } else {
                onComplete();
              }
            }}
          />
        }>
        <View style={styles.centered}>
          <Animation
            source={intro ? startAnimation : completeAnimation}
            loop={intro}
            style={styles.animation}
          />
          <WebText type="headline3" center>
            {intro ? 'Complete a Questionnaire' : 'Questionnaire Complete!'}
          </WebText>
          <WebText type="body4" color={webNeutral._500} center>
            {intro
              ? 'Complete the following questionnaire to ensure that you have sufficient understanding of wallet security.'
              : 'You have successfully passed the questionnaire. Tap Next to continue.'}
          </WebText>
        </View>
      </WebScreen>
    );
  }

  const question = QUESTIONS[index];
  const chosen = selected === null ? null : question.answers[selected];
  const wrong = chosen?.correct === false;

  return (
    <WebScreen
      header={header(back)}
      footer={
        <WebButton
          testID="questionnaire-next"
          title="Next"
          chevron
          disabled={chosen?.correct !== true}
          onPress={() => {
            resetAnswer();
            if (index + 1 >= QUESTIONS.length) {
              setPhase('complete');
            } else {
              setIndex(index + 1);
            }
          }}
        />
      }>
      <View style={styles.question}>
        <WebText type="headline3">Security Questionnaire</WebText>
        <WebText type="body3" color={webNeutral._300}>
          {`${question.index}. ${question.question}`}
        </WebText>
      </View>
      <View style={styles.answers} accessibilityRole="radiogroup">
        {question.answers.map((answer, answerIndex) => (
          <WebAnswerButton
            key={answer.answer}
            answer={answer.answer}
            correct={answer.correct}
            selected={selected === answerIndex}
            disabled={lock > 0}
            onPress={() => {
              setSelected(answerIndex);
              setLock(ANSWER_LOCK_SECONDS);
            }}
          />
        ))}
      </View>
      {wrong && (
        <View style={styles.warning} accessibilityLiveRegion="polite">
          <InfoIcon width={20} height={20} />
          <Text style={[webFonts.body6, styles.warningText]}>
            {lock > 0
              ? `Incorrect answer! Please try again in ${lock} seconds.`
              : 'Incorrect answer! Please try again.'}
          </Text>
        </View>
      )}
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  centered: {flex: 1, justifyContent: 'center', gap: 16},
  animation: {height: 120, marginBottom: 24},
  question: {gap: 16},
  answers: {gap: 16},
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 194, 36, 0.08)',
    backgroundColor: 'rgba(251, 194, 36, 0.08)',
  },
  warningText: {flex: 1, color: webWarning._100},
});
