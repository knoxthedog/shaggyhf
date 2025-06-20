import { parseSpyText } from './spy_parser';

test('parses multiple spies correctly', () => {
  const input = `
Name: IceBlueFire [776]
Level: 73

You managed to get the following results:
Speed: N/A
Strength: 100
Defense: 200
Dexterity: N/A
Total: N/A

Name: JackieChan [9000]
Level: 100

You managed to get the following results:
Speed: 9,000
Strength: 9,000
Defense: 9,000
Dexterity: 9,000
Total: N/A
========================
Name: BruceLee [9001]
Level: 100

You managed to get the following results:
Speed: 9,001
Strength: 9,001
Defense: 9,001
Dexterity: 9,001
Total: 36,004
  `;

  const result = parseSpyText(input);

  expect(result).toEqual([
    {
      name: 'IceBlueFire',
      level: '73',
      speed: 'N/A',
      strength: '100',
      defense: '200',
      dexterity: 'N/A',
      total: 'N/A',
    },
    {
      name: 'JackieChan',
      level: '100',
      speed: '9,000',
      strength: '9,000',
      defense: '9,000',
      dexterity: '9,000',
      total: 'N/A',
    },
    {
      name: 'BruceLee',
      level: '100',
      speed: '9,001',
      strength: '9,001',
      defense: '9,001',
      dexterity: '9,001',
      total: '36,004',
    },
  ]);
});
