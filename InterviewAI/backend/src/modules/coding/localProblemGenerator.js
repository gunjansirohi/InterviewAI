import { randomInt } from 'node:crypto';

const starterCode = {
  javascript: `const fs = require('fs');
const values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean).map(Number);

// Write your solution and print the required answer.`,
  python: `import sys

values = [int(value) for value in sys.stdin.read().split()]
# Write your solution and print the required answer.`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        List<Long> values = new ArrayList<>();
        while (input.hasNextLong()) values.add(input.nextLong());
        // Write your solution and print the required answer.
    }
}`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<long long> values;
    long long value;
    while (cin >> value) values.push_back(value);
    // Write your solution and print the required answer.
}`,
  c: `#include <stdio.h>

int main(void) {
    long long values[100000], value;
    int count = 0;
    while (count < 100000 && scanf("%lld", &value) == 1) values[count++] = value;
    /* Write your solution and print the required answer. */
    return 0;
}`,
  csharp: `using System;
using System.Linq;

public class MainClass {
    public static void Main() {
        long[] values = Console.In.ReadToEnd().Split((char[])null, StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();
        // Write your solution and print the required answer.
    }
}`,
  go: `package main

import "fmt"

func main() {
    values := make([]int64, 0)
    var value int64
    for { if _, err := fmt.Scan(&value); err != nil { break }; values = append(values, value) }
    // Write your solution and print the required answer.
}`,
};

const problemBank = [
  { title: 'Sum a Sequence', instruction: 'print their sum', example: ['2 4 6', '12'], hidden: [['1 2 3 4 5', '15'], ['-5 0 5 10', '10']] },
  { title: 'Find the Maximum', instruction: 'print the largest value', example: ['2 9 4', '9'], hidden: [['-8 -2 -11', '-2'], ['1 7 3 7 2', '7']] },
  { title: 'Find the Minimum', instruction: 'print the smallest value', example: ['2 -3 6', '-3'], hidden: [['8 2 11', '2'], ['-1 -7 -3', '-7']] },
  { title: 'Count Even Values', instruction: 'print how many values are even', example: ['2 3 4 7', '2'], hidden: [['1 3 5', '0'], ['0 -2 8 9', '3']] },
  { title: 'Count Positive Values', instruction: 'print how many values are greater than zero', example: ['-2 0 4 7', '2'], hidden: [['-1 -3 0', '0'], ['1 2 -5 6', '3']] },
  { title: 'Sequence Range', instruction: 'print the difference between the largest and smallest values', example: ['2 9 4', '7'], hidden: [['-8 -2 -11', '9'], ['5 5 5', '0']] },
  { title: 'Product of Values', instruction: 'print their product', example: ['2 3 4', '24'], hidden: [['-2 3 5', '-30'], ['0 8 9', '0']] },
  { title: 'Count Distinct Values', instruction: 'print the number of distinct values', example: ['2 2 4 6 4', '3'], hidden: [['1 1 1', '1'], ['-2 0 -2 3', '3']] },
  { title: 'Second Largest Distinct Value', instruction: 'print the second largest distinct value', example: ['2 9 4 9', '4'], hidden: [['1 5 3 4', '4'], ['-5 -2 -9', '-5']] },
  { title: 'Longest Increasing Run', instruction: 'print the length of the longest contiguous strictly increasing run', example: ['1 2 5 3 4', '3'], hidden: [['5 4 3', '1'], ['1 2 2 3 4', '3']] },
];

export function generateLocalProblems({ language, difficulty, topic, questionCount, avoidTitles = [] }) {
  const topicLabel = capitalize(topic);
  const avoided = new Set(avoidTitles.map((title) => title.toLowerCase()));
  const shuffled = shuffle(problemBank);
  const fresh = shuffled.filter((item) => !avoided.has(`${topicLabel}: ${item.title}`.toLowerCase()));
  const selected = [...fresh, ...shuffled.filter((item) => !fresh.includes(item))].slice(0, questionCount);
  return selected.map((item) => ({
    title: `${topicLabel}: ${item.title}`,
    statement: `Given a whitespace-separated sequence of integers, ${item.instruction}. Solve this ${difficulty} ${topic} challenge using standard input and output.`,
    examples: [{ input: item.example[0], output: item.example[1], explanation: `The required result is ${item.example[1]}.` }],
    constraints: constraintsFor(difficulty),
    starterCode: starterCode[language],
    publicTestCases: [{ input: item.example[0], expectedOutput: item.example[1] }],
    hiddenTestCases: item.hidden.map(([input, expectedOutput]) => ({ input, expectedOutput })),
  }));
}

function constraintsFor(difficulty) {
  if (difficulty === 'hard') return ['2 <= number of integers <= 100000', 'Each integer is between -1000000000 and 1000000000', 'Aim for an O(n) or O(n log n) solution'];
  if (difficulty === 'medium') return ['2 <= number of integers <= 10000', 'Each integer is between -1000000 and 1000000'];
  return ['2 <= number of integers <= 1000', 'Each integer is between -10000 and 10000'];
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
