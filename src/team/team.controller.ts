import { BaseController } from "#shared/base.controller.ts";
import { TeamService } from "#team/team.service.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

import { ITeam } from "./team.types.ts";

export class TeamController extends BaseController {
  constructor(private teamService: TeamService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let teams: ITeam[] = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];

      if (teams.length === 0) {
        teams = await this.teamService.getAll();
        cachedInfo.set(CACHE_KEYS.TEAMS, teams);
      }

      return teams;
    });
  };
  getByConferenceAndDivision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let teams: ITeam[] = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];

      if (teams.length === 0) {
        teams = await this.teamService.getAll();
        cachedInfo.set(CACHE_KEYS.TEAMS, teams);
      }

      const AFC = {
        East: teams
          .filter((team) => team.division === "East" && team.conference === "AFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        North: teams
          .filter((team) => team.division === "North" && team.conference === "AFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        South: teams
          .filter((team) => team.division === "South" && team.conference === "AFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        West: teams
          .filter((team) => team.division === "West" && team.conference === "AFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
      const NFC = {
        East: teams
          .filter((team) => team.division === "East" && team.conference === "NFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        North: teams
          .filter((team) => team.division === "North" && team.conference === "NFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        South: teams
          .filter((team) => team.division === "South" && team.conference === "NFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
        West: teams
          .filter((team) => team.division === "West" && team.conference === "NFC")
          .sort((a, b) => a.name.localeCompare(b.name)),
      };

      return {
        AFC,
        NFC,
      };
    });
  };
}
