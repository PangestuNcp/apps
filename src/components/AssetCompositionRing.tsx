import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
} from 'react-native-svg';

type AssetItem = {
  key: string;
  name: string;
  amount: number;
  color: string;
};

type Props = {
  assets: AssetItem[];
};

const SIZE = 330;
const CENTER = SIZE / 2;

const RADIUS = 92;
const STROKE_WIDTH = 22;

const CONNECTOR_START = 105;
const CONNECTOR_END = 128;
const LABEL_RADIUS = 145;

function formatRupiah(nominal: number) {
  return `Rp${nominal.toLocaleString('id-ID')}`;
}

/**
 * Sudut:
 *
 * 0°   = jam 12
 * 90°  = jam 3
 * 180° = jam 6
 * 270° = jam 9
 *
 * Bergerak searah jarum jam.
 */
function polarToCartesian(
  angle: number,
  radius: number
) {
  const radians =
    ((angle - 90) * Math.PI) / 180;

  return {
    x:
      CENTER +
      radius * Math.cos(radians),

    y:
      CENTER +
      radius * Math.sin(radians),
  };
}

export default function AssetCompositionRing({
  assets,
}: Props) {
  const [selectedKey, setSelectedKey] =
    useState<string | null>(null);

  const total = useMemo(
    () =>
      assets.reduce(
        (sum, item) =>
          sum + Math.max(item.amount, 0),
        0
      ),
    [assets]
  );

  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (item) => item.amount > 0
      ),
    [assets]
  );

  const circumference =
    2 * Math.PI * RADIUS;

  const selectedAsset =
    visibleAssets.find(
      (item) =>
        item.key === selectedKey
    ) ?? null;

  /*
   * Posisi segmen dihitung mulai dari 0°.
   *
   * 0° → 90° → 180° → 270° → 360°
   *
   * Karena SVG secara default bergerak berlawanan
   * arah jarum jam, kita menggunakan transform
   * scaleY(-1) agar arah visual menjadi clockwise.
   */

  let accumulatedPercentage = 0;

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        <Svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          <G
            scaleY={-1}
            origin={`${CENTER}, ${CENTER}`}
          >
            {/* Ring dasar */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke="#E7F0ED"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />

            {/* Segmen komposisi aset */}
            {total > 0 &&
              visibleAssets.map(
                (item) => {
                  const percentage =
                    item.amount /
                    total;

                  const segmentLength =
                    percentage *
                    circumference;

                  const gap = 3;

                  const visibleLength =
                    Math.max(
                      segmentLength - gap,
                      0
                    );

                  const start =
                    accumulatedPercentage;

                  accumulatedPercentage +=
                    percentage;

                  const dashOffset =
                    -start *
                    circumference;

                  const isSelected =
                    selectedKey ===
                    item.key;

                  return (
                    <Circle
                      key={item.key}
                      cx={CENTER}
                      cy={CENTER}
                      r={
                        isSelected
                          ? RADIUS + 4
                          : RADIUS
                      }
                      stroke={
                        item.color
                      }
                      strokeWidth={
                        isSelected
                          ? STROKE_WIDTH + 5
                          : STROKE_WIDTH
                      }
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${visibleLength} ${circumference}`}
                      strokeDashoffset={
                        dashOffset
                      }
                      onPress={() =>
                        setSelectedKey(
                          isSelected
                            ? null
                            : item.key
                        )
                      }
                    />
                  );
                }
              )}

            {/* Connector line */}
            {total > 0 &&
              (() => {
                let current =
                  0;

                return visibleAssets.map(
                  (item) => {
                    const percentage =
                      item.amount /
                      total;

                    const startAngle =
                      current * 360;

                    const endAngle =
                      (current +
                        percentage) *
                      360;

                    const middleAngle =
                      (startAngle +
                        endAngle) /
                      2;

                    current += percentage;

                    const start =
                      polarToCartesian(
                        middleAngle,
                        CONNECTOR_START
                      );

                    const end =
                      polarToCartesian(
                        middleAngle,
                        CONNECTOR_END
                      );

                    return (
                      <Line
                        key={`connector-${item.key}`}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={
                          item.color
                        }
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    );
                  }
                );
              })()}
          </G>
        </Svg>

        {/* Label akun */}
        {total > 0 &&
          (() => {
            let current =
              0;

            return visibleAssets.map(
              (item) => {
                const percentage =
                  item.amount /
                  total;

                const startAngle =
                  current * 360;

                const endAngle =
                  (current +
                    percentage) *
                  360;

                const middleAngle =
                  (startAngle +
                    endAngle) /
                  2;

                current += percentage;

                const position =
                  polarToCartesian(
                    middleAngle,
                    LABEL_RADIUS
                  );

                const isSelected =
                  selectedKey ===
                  item.key;

                let textAlign:
                  | 'left'
                  | 'center'
                  | 'right' =
                  'center';

                if (
                  position.x <
                  CENTER - 30
                ) {
                  textAlign = 'right';
                } else if (
                  position.x >
                  CENTER + 30
                ) {
                  textAlign = 'left';
                }

                return (
                  <Pressable
                    key={`label-${item.key}`}
                    onPress={() =>
                      setSelectedKey(
                        isSelected
                          ? null
                          : item.key
                      )
                    }
                    style={[
                      styles.accountLabel,
                      {
                        left:
                          position.x -
                          55,

                        top:
                          position.y -
                          18,
                      },

                      isSelected &&
                        styles.accountLabelSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.accountDot,
                        {
                          backgroundColor:
                            item.color,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.accountName,
                        {
                          color:
                            item.color,
                          textAlign,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }
            );
          })()}

        {/* Konten tengah */}
        <View style={styles.centerContent}>
          {selectedAsset ? (
            <>
              <View
                style={[
                  styles.selectedDot,
                  {
                    backgroundColor:
                      selectedAsset.color,
                  },
                ]}
              />

              <Text
                style={styles.centerLabel}
              >
                {selectedAsset.name}
              </Text>

              <Text
                style={styles.centerAmount}
              >
                {formatRupiah(
                  selectedAsset.amount
                )}
              </Text>

              <Text
                style={
                  styles.centerPercentage
                }
              >
                {(
                  (selectedAsset.amount /
                    total) *
                  100
                ).toFixed(1)}
                % dari aset
              </Text>
            </>
          ) : (
            <>
              <Text
                style={styles.centerLabel}
              >
                TOTAL ASET
              </Text>

              <Text
                style={styles.centerAmount}
              >
                {formatRupiah(total)}
              </Text>

              <Text
                style={styles.centerHint}
              >
                Ketuk bagian ring
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },

  chartArea: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerContent: {
    position: 'absolute',
    width: 160,
    height: 105,
    left: (SIZE - 160) / 2,
    top: (SIZE - 105) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#66889A',
    textAlign: 'center',
  },

  centerAmount: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: '700',
    color: '#104F5A',
    textAlign: 'center',
  },

  centerHint: {
    marginTop: 5,
    fontSize: 9,
    color: '#9AAEB5',
  },

  centerPercentage: {
    marginTop: 4,
    fontSize: 10,
    color: '#8AA1A8',
  },

  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },

  accountLabel: {
    position: 'absolute',
    width: 110,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  accountLabelSelected: {
    transform: [
      {
        scale: 1.08,
      },
    ],
  },

  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  accountName: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
});
