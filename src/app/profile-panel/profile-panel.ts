import { Component, input } from '@angular/core';
import { CONTACT_EMAIL, SKILLS, Skill } from '../data/content';

const NAME_W = 12;
const BAR_W = 20;

interface AsciiTable {
  top: string;
  head: string;
  divider: string;
  rows: string[];
  bottom: string;
}

/** Monta a tabela de skills em arte ASCII (39 colunas: cabe em telas de 360px). */
function buildSkillsTable(skills: Skill[]): AsciiTable {
  const padEnd = (text: string, width: number) => text + ' '.repeat(Math.max(0, width - text.length));
  const center = (text: string, width: number) => {
    const left = Math.floor((width - text.length) / 2);
    return ' '.repeat(left) + text + ' '.repeat(width - text.length - left);
  };
  const rule = (l: string, m: string, r: string) =>
    l + '═'.repeat(NAME_W + 2) + m + '═'.repeat(BAR_W + 2) + r;

  return {
    top: rule('╔', '╤', '╗'),
    head: `║ ${center('skill', NAME_W)} │ ${center('nível', BAR_W)} ║`,
    divider: rule('╠', '╪', '╣'),
    rows: skills.map((skill) => {
      const filled = Math.round((skill.level / 100) * BAR_W);
      return `║ ${padEnd(skill.name, NAME_W)} │ ${'█'.repeat(filled)}${' '.repeat(BAR_W - filled)} ║`;
    }),
    bottom: rule('╚', '╧', '╝'),
  };
}

@Component({
  selector: 'app-profile-panel',
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.scss',
})
export class ProfilePanel {
  readonly yearsCoding = input.required<number>();

  protected readonly email = CONTACT_EMAIL;
  protected readonly skills = SKILLS;
  protected readonly table = buildSkillsTable(SKILLS);
}
